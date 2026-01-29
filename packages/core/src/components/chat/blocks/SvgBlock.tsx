import { type Component } from 'solid-js';
import { cn } from '../../../utils/cn';

export interface SvgBlockProps {
  content: string;
  class?: string;
}

export const SvgBlock: Component<SvgBlockProps> = (props) => {
  // Basic SVG sanitization
  const sanitizeSvg = (svg: string): string => {
    // Remove potentially dangerous script/event handlers
    return svg
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+="[^"]*"/gi, '')
      .replace(/on\w+='[^']*'/gi, '');
  };

  return (
    <div
      class={cn('chat-svg-block', props.class)}
      // eslint-disable-next-line solid/no-innerhtml -- SVG is sanitized before rendering
      innerHTML={sanitizeSvg(props.content)}
    />
  );
};
