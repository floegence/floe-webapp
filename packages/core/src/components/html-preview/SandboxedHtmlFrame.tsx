import { createEffect, createMemo, createSignal, onCleanup, onMount, Show, type JSX } from 'solid-js';
import { sandboxedMarkdownHtml } from '../chat/markdown/media';
import { secureRandomUUID } from '../../utils/secureRandom';

export interface SandboxedHtmlFrameLabels {
  linkUnavailable: string;
  anchorUnavailable: string;
}

export interface SandboxedHtmlFrameProps {
  html: string;
  title: string;
  class?: string;
  style?: JSX.CSSProperties;
  inert?: boolean;
  tabIndex?: number;
  labels?: SandboxedHtmlFrameLabels;
  /** An untrusted link intent. The host must resolve and authorize every target. */
  onOpenLink?: (href: string, signal: AbortSignal) => void | Promise<void>;
}

// Runs before supplied scripts. The private port is never exposed to page code;
// only real link activation can publish an intent through it.
function linkBootstrap(token: string): string {
  return `<script>(()=>{
    const channel=new MessageChannel();
    const publish=channel.port1.postMessage.bind(channel.port1);
    const stop=Function.call.bind(Event.prototype.stopImmediatePropagation);
    const prevent=Function.call.bind(Event.prototype.preventDefault);
    const eventTarget=Function.call.bind(Object.getOwnPropertyDescriptor(Event.prototype,'target').get);
    const closest=Function.call.bind(Element.prototype.closest);
    const attribute=Function.call.bind(Element.prototype.getAttribute);
    const find=document.getElementById.bind(document);
    const named=document.getElementsByName.bind(document);
    const scroll=Function.call.bind(Element.prototype.scrollIntoView);
    const focus=Function.call.bind(HTMLElement.prototype.focus);
    const decode=decodeURIComponent;
    const ElementType=Element,HtmlElementType=HTMLElement;
    window.addEventListener('click',activate,true);
    window.addEventListener('auxclick',activate,true);
    function activate(event){
      const target=eventTarget(event);
      if(!(target instanceof ElementType))return;
      const anchor=closest(target,'a[href],area[href]');
      if(!anchor)return;
      prevent(event);stop(event);
      if(!event.isTrusted)return;
      if(event.type==='auxclick'&&event.button!==1)return;
      const href=attribute(anchor,'href');
      if(typeof href!=='string'||href.length>8192)return;
      if(href.startsWith('#')){
        let fragment;try{fragment=decode(href.slice(1))}catch{publish({type:'anchor-missing'});return}
        const target=fragment?(find(fragment)||named(fragment)[0]):document.documentElement;
        if(!target){publish({type:'anchor-missing'});return}
        scroll(target,{block:'start'});
        if(target instanceof HtmlElementType)focus(target,{preventScroll:true});
        publish({type:'anchor-opened'});
        return;
      }
      publish({type:'open-link',href});
    }
    parent.postMessage({type:'floe-html-ready',token:${JSON.stringify(token)}},'*',[channel.port2]);
  })()</script>`;
}

/** A self-contained opaque document with a user-activated, host-authorized link boundary. */
export function SandboxedHtmlFrame(props: SandboxedHtmlFrameProps) {
  let frame!: HTMLIFrameElement;
  let connect: ((event: MessageEvent) => void) | undefined;
  const [error, setError] = createSignal('');
  const document = createMemo(() => {
    const token = secureRandomUUID();
    return { token, html: sandboxedMarkdownHtml(linkBootstrap(token) + props.html) };
  });

  createEffect(() => {
    const { token } = document();
    const controller = new AbortController();
    let port: MessagePort | undefined;
    let request = 0;
    setError('');
    connect = (event: MessageEvent) => {
      if (!event.isTrusted || event.source !== frame.contentWindow || port
        || event.data?.type !== 'floe-html-ready' || event.data?.token !== token
        || event.ports.length !== 1) return;
      port = event.ports[0];
      port.onmessage = (message: MessageEvent<unknown>) => {
        if (controller.signal.aborted || props.inert) return;
        const data = message.data as { type?: unknown; href?: unknown } | null;
        if (data?.type === 'anchor-opened') { setError(''); return; }
        if (data?.type === 'anchor-missing') {
          setError(props.labels?.anchorUnavailable ?? 'The linked section was not found.');
          return;
        }
        if (data?.type !== 'open-link' || typeof data.href !== 'string' || data.href.length > 8192) return;
        const href = data.href;
        const handler = props.onOpenLink;
        const unavailable = props.labels?.linkUnavailable;
        const current = ++request;
        setError('');
        void Promise.resolve().then(() => {
          if (controller.signal.aborted) return;
          if (!handler) throw new Error(unavailable ?? 'Opening links is unavailable in this preview.');
          return handler(href, controller.signal);
        }).catch((reason: unknown) => {
          if (!controller.signal.aborted && current === request) {
            setError(reason instanceof Error && reason.message
              ? reason.message : unavailable ?? 'This link could not be opened.');
          }
        });
      };
      port.start();
    };
    onCleanup(() => { controller.abort(); port?.close(); connect = undefined; });
  });

  const receive = (event: MessageEvent) => connect?.(event);
  onMount(() => {
    window.addEventListener('message', receive);
    onCleanup(() => window.removeEventListener('message', receive));
  });

  return (
    <span class="flex h-full min-h-0 w-full flex-col">
      <iframe ref={frame} class={props.class} title={props.title}
        srcdoc={document().html} sandbox="allow-scripts" referrerPolicy="no-referrer"
        inert={props.inert} tabIndex={props.tabIndex}
        style={{ display: 'block', width: '100%', 'min-height': '0', flex: '1 1 0%', border: '0', ...props.style }} />
      <Show when={error()}>
        <span role="alert" class="max-h-24 shrink-0 overflow-auto break-words bg-background px-3 py-2 text-xs text-destructive">{error()}</span>
      </Show>
    </span>
  );
}
