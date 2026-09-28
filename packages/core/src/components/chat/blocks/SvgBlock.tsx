import { type Component } from 'solid-js';
import DOMPurify from 'dompurify';
import { cn } from '../../../utils/cn';

export interface SvgBlockProps {
  content: string;
  class?: string;
}

export const SvgBlock: Component<SvgBlockProps> = (props) => {
  // Server rendering has no DOM parser. Hydration renders the sanitized SVG
  // once the browser can apply the same parser rules as the injection sink.
  const sanitizeSvg = (svg: string): string => DOMPurify.isSupported
    ? DOMPurify.sanitize(svg, { USE_PROFILES: { svg: true, svgFilters: true } })
    : '';

  return (
    <div
      class={cn('chat-svg-block', props.class)}
      // eslint-disable-next-line solid/no-innerhtml -- SVG is sanitized before rendering
      innerHTML={sanitizeSvg(props.content)}
    />
  );
};
