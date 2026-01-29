import { type Component, Switch, Match, lazy, Suspense } from 'solid-js';
import type { MessageBlock } from '../types';
import { TextBlock } from './TextBlock';
import { MarkdownBlock } from './MarkdownBlock';
import { ImageBlock } from './ImageBlock';
import { FileBlock } from './FileBlock';
import { ChecklistBlock } from './ChecklistBlock';
import { ShellBlock } from './ShellBlock';
import { ThinkingBlock } from './ThinkingBlock';
import { Skeleton } from '../../loading';

// 重型组件懒加载
const CodeBlock = lazy(() => import('./CodeBlock').then((m) => ({ default: m.CodeBlock })));
const CodeDiffBlock = lazy(() => import('./CodeDiffBlock').then((m) => ({ default: m.CodeDiffBlock })));
const MermaidBlock = lazy(() => import('./MermaidBlock').then((m) => ({ default: m.MermaidBlock })));
const SvgBlock = lazy(() => import('./SvgBlock').then((m) => ({ default: m.SvgBlock })));
const ToolCallBlock = lazy(() => import('./ToolCallBlock').then((m) => ({ default: m.ToolCallBlock })));

export interface BlockRendererProps {
  block: MessageBlock;
  messageId: string;
  blockIndex: number;
}

export const BlockRenderer: Component<BlockRendererProps> = (props) => {
  return (
    <Switch
      fallback={
        <div class="chat-block-unknown">
          Unknown block type: {(props.block as { type: string }).type}
        </div>
      }
    >
      <Match when={props.block.type === 'text'}>
        <TextBlock content={(props.block as { content: string }).content} />
      </Match>

      <Match when={props.block.type === 'markdown'}>
        <MarkdownBlock content={(props.block as { content: string }).content} />
      </Match>

      <Match when={props.block.type === 'code'}>
        <Suspense fallback={<CodeBlockSkeleton />}>
          <CodeBlock
            language={(props.block as { language: string }).language}
            content={(props.block as { content: string }).content}
            filename={(props.block as { filename?: string }).filename}
          />
        </Suspense>
      </Match>

      <Match when={props.block.type === 'code-diff'}>
        <Suspense fallback={<CodeBlockSkeleton />}>
          <CodeDiffBlock
            language={(props.block as { language: string }).language}
            oldCode={(props.block as { oldCode: string }).oldCode}
            newCode={(props.block as { newCode: string }).newCode}
            filename={(props.block as { filename?: string }).filename}
          />
        </Suspense>
      </Match>

      <Match when={props.block.type === 'image'}>
        <ImageBlock
          src={(props.block as { src: string }).src}
          alt={(props.block as { alt?: string }).alt}
        />
      </Match>

      <Match when={props.block.type === 'svg'}>
        <Suspense fallback={<Skeleton class="h-32 w-full" />}>
          <SvgBlock content={(props.block as { content: string }).content} />
        </Suspense>
      </Match>

      <Match when={props.block.type === 'mermaid'}>
        <Suspense fallback={<MermaidSkeleton />}>
          <MermaidBlock content={(props.block as { content: string }).content} />
        </Suspense>
      </Match>

      <Match when={props.block.type === 'checklist'}>
        <ChecklistBlock
          items={(props.block as { items: any[] }).items}
          messageId={props.messageId}
          blockIndex={props.blockIndex}
        />
      </Match>

      <Match when={props.block.type === 'shell'}>
        <ShellBlock
          command={(props.block as { command: string }).command}
          output={(props.block as { output?: string }).output}
          exitCode={(props.block as { exitCode?: number }).exitCode}
          status={(props.block as { status: 'running' | 'success' | 'error' }).status}
        />
      </Match>

      <Match when={props.block.type === 'file'}>
        <FileBlock
          name={(props.block as { name: string }).name}
          size={(props.block as { size: number }).size}
          mimeType={(props.block as { mimeType: string }).mimeType}
          url={(props.block as { url?: string }).url}
        />
      </Match>

      <Match when={props.block.type === 'thinking'}>
        <ThinkingBlock
          content={(props.block as { content?: string }).content}
          duration={(props.block as { duration?: number }).duration}
        />
      </Match>

      <Match when={props.block.type === 'tool-call'}>
        <Suspense fallback={<ToolCallSkeleton />}>
          <ToolCallBlock
            block={props.block as any}
            messageId={props.messageId}
            blockIndex={props.blockIndex}
          />
        </Suspense>
      </Match>
    </Switch>
  );
};

// 骨架屏组件
const CodeBlockSkeleton: Component = () => (
  <div class="chat-code-skeleton">
    <div class="chat-code-skeleton-header">
      <Skeleton class="h-4 w-20" />
    </div>
    <div class="chat-code-skeleton-body">
      <Skeleton class="h-4 w-3/4 mb-2" />
      <Skeleton class="h-4 w-1/2 mb-2" />
      <Skeleton class="h-4 w-5/6 mb-2" />
      <Skeleton class="h-4 w-2/3" />
    </div>
  </div>
);

const MermaidSkeleton: Component = () => (
  <div class="chat-mermaid-skeleton">
    <Skeleton class="h-48 w-full" />
  </div>
);

const ToolCallSkeleton: Component = () => (
  <div class="chat-tool-skeleton">
    <div class="flex items-center gap-2 p-3">
      <Skeleton class="h-4 w-4 rounded" />
      <Skeleton class="h-4 w-32" />
    </div>
  </div>
);
