import { type Component } from 'solid-js';
import { cn } from '../../../utils/cn';

export interface SvgBlockProps {
  content: string;
  class?: string;
}

export const SvgBlock: Component<SvgBlockProps> = (props) => {
  // 简单的 SVG 安全处理
  const sanitizeSvg = (svg: string): string => {
    // 移除可能的脚本标签
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
