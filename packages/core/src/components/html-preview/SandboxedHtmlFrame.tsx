import { createEffect, createMemo, createSignal, onCleanup, onMount, Show, untrack, type JSX } from 'solid-js';
import { sandboxedMarkdownHtml } from '../chat/markdown/media';
import { findTextRanges } from '../ui/textSearch';
import { secureRandomUUID } from '../../utils/secureRandom';

export interface SandboxedHtmlFrameLabels {
  linkUnavailable: string;
  anchorUnavailable: string;
  pointerLocked?: string;
}

export interface SandboxedHtmlSearch {
  search: (query: string, direction?: -1 | 0 | 1) => void;
  clear: () => void;
}

export interface SandboxedHtmlFrameProps {
  onSearchReady?: (search: SandboxedHtmlSearch | undefined) => void;
  onSearchState?: (state: { current: number; total: number }) => void;
  onSearchRequest?: (action: 'open' | 'close') => void;
  html: string;
  title: string;
  class?: string;
  style?: JSX.CSSProperties;
  inert?: boolean;
  /** Deactivation pauses native media and releases pointer lock; neither resumes automatically. */
  active?: boolean;
  /** Localized presentation while this exact document loads and reaches a render opportunity. */
  renderPending?: () => JSX.Element;
  onPresentationStateChange?: (state: 'loading' | 'ready') => void;
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
    const query=document.querySelectorAll.bind(document);
    const MediaElementType=HTMLMediaElement;
    const pause=Function.call.bind(MediaElementType.prototype.pause);
    const lockGetter=Object.getOwnPropertyDescriptor(Document.prototype,'pointerLockElement')?.get;
    const locked=lockGetter?Function.call.bind(lockGetter,document):()=>null;
    const exitLock=document.exitPointerLock?.bind(document);
    const hasFocus=document.hasFocus.bind(document);
    let pointerLockAllowed=false,pointerGesture=false;
    const releaseLock=()=>{pointerGesture=false;if(locked())exitLock()};
    window.addEventListener('blur',releaseLock);
    document.addEventListener('visibilitychange',()=>{if(document.hidden)releaseLock()});
    const gesture=event=>{if(event.isTrusted&&pointerLockAllowed)pointerGesture=true};
    window.addEventListener('pointerdown',gesture,true);
    window.addEventListener('keydown',event=>{
      if(event.isTrusted&&event.key==='Escape'&&locked()){event.preventDefault();event.stopImmediatePropagation();releaseLock();return}
      if(event.key==='Enter'||event.key===' ')gesture(event);
    },true);
    document.addEventListener('pointerlockchange',()=>{
      const value=!!locked();
      if(value&&(!pointerLockAllowed||!pointerGesture||!hasFocus()||document.hidden)){releaseLock();return}
      pointerGesture=false;
      publish({type:'pointer-lock',locked:value});
    });
    let active=true,searchEnabled=false,searchOpen=false,searchQuery='',matches=[],matchIndex=0;
    const findRanges=(${findTextRanges.toString()});
    const clearHighlights=()=>{CSS.highlights?.delete('floe-html-find');CSS.highlights?.delete('floe-html-find-current')};
    const paint=()=>{
      clearHighlights();
      if(!active||!searchOpen)return;
      if(typeof Highlight!=='undefined'&&CSS.highlights){
        CSS.highlights.set('floe-html-find',new Highlight(...matches));
        if(matches[matchIndex])CSS.highlights.set('floe-html-find-current',new Highlight(matches[matchIndex]));
      }
    };
    const search=data=>{
      if(!active||typeof data.query!=='string')return;
      searchOpen=true;
      const previous=searchQuery;
      searchQuery=data.query;matches=findRanges(document.body,searchQuery);
      matchIndex=matches.length?(previous!==searchQuery||!data.direction?0:(matchIndex+data.direction+matches.length)%matches.length):0;
      paint();
      const range=matches[matchIndex];
      if(range){const element=range.startContainer.parentElement;scroll(element,{block:'center',inline:'nearest'})}
      publish({type:'search-state',request:data.request,current:matches.length?matchIndex+1:0,total:matches.length});
    };
    channel.port1.onmessage=event=>{
      if(event.data?.type==='search'){search(event.data);return}
      if(event.data?.type==='clear-search'){searchOpen=false;clearHighlights();return}
      if(event.data?.type!=='activation')return;
      active=event.data.active===true;searchEnabled=event.data.searchEnabled===true;
      pointerLockAllowed=event.data.pointerLockAllowed===true;
      if(!pointerLockAllowed)releaseLock();
      paint();
      if(!active)for(const media of query('video,audio'))pause(media);
    };
    channel.port1.start();
    window.addEventListener('play',event=>{const media=eventTarget(event);if(!active&&media instanceof MediaElementType)pause(media)},true);
    window.addEventListener('load',event=>{if(event.isTrusted)publish({type:'document-loaded'})},{once:true});
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
    window.addEventListener('keydown',event=>{
      if(!active||!searchEnabled||!event.isTrusted||event.isComposing)return;
      if((event.ctrlKey||event.metaKey)&&!event.altKey&&event.key.toLowerCase()==='f'){prevent(event);stop(event);publish({type:'search-open'})}
      else if(searchOpen&&event.key==='Escape'){prevent(event);stop(event);publish({type:'search-close'})}
    },true);
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
  })()</script><style>::highlight(floe-html-find){background:#fde68a;color:#111}::highlight(floe-html-find-current){background:#2563eb;color:#fff}</style>`;
}

/** A self-contained opaque document with a user-activated, host-authorized link boundary. */
export function SandboxedHtmlFrame(props: SandboxedHtmlFrameProps) {
  let frame!: HTMLIFrameElement;
  let connect: ((event: MessageEvent) => void) | undefined;
  const [error, setError] = createSignal('');
  const [pointerLockHint, setPointerLockHint] = createSignal(false);
  const [readyToken, setReadyToken] = createSignal('');
  const [channel, setChannel] = createSignal<MessagePort>();
  const document = createMemo(() => {
    const token = secureRandomUUID();
    return { token, html: sandboxedMarkdownHtml(linkBootstrap(token) + props.html) };
  });

  const ready = () => readyToken() === document().token;
  createEffect(() => {
    const state = ready() ? 'ready' : 'loading';
    untrack(() => props.onPresentationStateChange?.(state));
  });
  createEffect(() => { channel()?.postMessage({ type: 'activation', active: props.active !== false, pointerLockAllowed: props.active !== false && !props.inert && ready(), searchEnabled: !!props.onSearchRequest }); });

  createEffect(() => {
    const { token: initialToken } = document();
    const controller = new AbortController();
    let port: MessagePort | undefined;
    let request = 0;
    let paintRequest = 0;
    let loaded = false;
    let searchRequest = 0;
    let pointerLockHintTimer: ReturnType<typeof setTimeout> | undefined;
    setError('');
    setPointerLockHint(false);
    connect = (event: MessageEvent) => {
      if (!event.isTrusted || event.source !== frame.contentWindow || port
        || event.data?.type !== 'floe-html-ready' || event.data?.token !== initialToken
        || event.ports.length !== 1) return;
      port = event.ports[0];
      setChannel(port);
      props.onSearchReady?.({
        search: (query, direction = 0) => {
          if (controller.signal.aborted || props.inert || props.active === false || !ready()) return;
          port?.postMessage({ type: 'search', query, direction, request: ++searchRequest });
        },
        clear: () => { if (!controller.signal.aborted) { searchRequest++; port?.postMessage({ type: 'clear-search' }); } },
      });
      port.onmessage = (message: MessageEvent<unknown>) => {
        if (controller.signal.aborted) return;
        const data = message.data as { type?: unknown; locked?: unknown; href?: unknown; request?: unknown; current?: unknown; total?: unknown } | null;
        if (data?.type === 'pointer-lock' && typeof data.locked === 'boolean') {
          clearTimeout(pointerLockHintTimer);
          if (data.locked) pointerLockHintTimer = setTimeout(() => setPointerLockHint(false), 3000);
          setPointerLockHint(data.locked && !props.inert && props.active !== false && ready());
          return;
        }
        if (data?.type === 'document-loaded') {
          if (loaded) return;
          loaded = true;
          // Keep the iframe laid out behind the pending surface while the new
          // srcdoc reaches rendering opportunities. This is not an app-idle claim.
          paintRequest = requestAnimationFrame(() => {
            paintRequest = requestAnimationFrame(() => {
              if (!controller.signal.aborted) setReadyToken(initialToken);
            });
          });
          return;
        }
        if (props.inert || props.active === false || !ready()) return;
        if (data?.type === 'search-state') {
          if (data.request === searchRequest && Number.isSafeInteger(data.current) && Number.isSafeInteger(data.total)
            && (data.current as number) >= 0 && (data.current as number) <= (data.total as number))
            props.onSearchState?.({ current: data.current as number, total: data.total as number });
          return;
        }
        if (data?.type === 'search-open' || data?.type === 'search-close') {
          props.onSearchRequest?.(data.type === 'search-open' ? 'open' : 'close'); return;
        }
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
    onCleanup(() => {
      clearTimeout(pointerLockHintTimer);
      controller.abort(); cancelAnimationFrame(paintRequest); port?.close();
      setChannel(undefined); connect = undefined; props.onSearchReady?.(undefined);
    });
  });

  const receive = (event: MessageEvent) => connect?.(event);
  onMount(() => {
    window.addEventListener('message', receive);
    onCleanup(() => window.removeEventListener('message', receive));
  });

  return (
    <span class="relative flex h-full min-h-0 w-full flex-col" data-floe-html-state={ready() ? 'ready' : 'loading'} aria-busy={!ready()}>
      <Show when={!ready()}><span data-floe-html-pending style={{ position: 'absolute', inset: '0', 'z-index': '1', background: 'var(--background, Canvas)' }}>
        {props.renderPending?.()}
      </span></Show>
      <iframe ref={frame} class={props.class} title={props.title}
        srcdoc={document().html} sandbox="allow-scripts allow-pointer-lock" referrerPolicy="no-referrer"
        inert={props.inert || props.active === false || !ready()} tabIndex={props.inert || props.active === false || !ready() ? -1 : props.tabIndex}
        style={{ display: 'block', width: '100%', 'min-height': '0', flex: '1 1 0%', border: '0', ...props.style, opacity: ready() ? undefined : '0' }} />
      <Show when={pointerLockHint()}>
        <span role="status" class="pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center px-3">
          <span class="rounded-md bg-background px-3 py-2 text-xs text-foreground shadow-sm">{props.labels?.pointerLocked ?? 'Mouse locked; press Esc to exit'}</span>
        </span>
      </Show>
      <Show when={error()}>
        <span role="alert" class="max-h-24 shrink-0 overflow-auto break-words bg-background px-3 py-2 text-xs text-destructive">{error()}</span>
      </Show>
    </span>
  );
}
