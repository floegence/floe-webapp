import { describe, expect, it } from 'vitest';
import { renderToString } from 'solid-js/web';
import { ChatProvider } from '../src/components/chat/ChatProvider';
import { FileBlock } from '../src/components/chat/blocks/FileBlock';
import { ToolCallBlock } from '../src/components/chat/blocks/ToolCallBlock';
import type { ToolCallBlock as ToolCallBlockType } from '../src/components/chat/types';

describe('chat block accessibility', () => {
  it('renders downloadable file blocks as buttons with an accessible label', () => {
    const html = renderToString(() => (
      <FileBlock
        name="report.pdf"
        size={2048}
        mimeType="application/pdf"
        url="https://example.com/report.pdf"
      />
    ));

    expect(html).toContain('<button');
    expect(html).toContain('aria-label="Download report.pdf"');
  });

  it('renders tool-call disclosure through a dedicated button instead of a clickable header div', () => {
    const block: ToolCallBlockType = {
      type: 'tool-call',
      toolName: 'exec',
      toolId: 'tool-1',
      args: { cmd: 'pwd' },
      status: 'success',
      collapsed: true,
      result: 'ok',
    };

    const html = renderToString(() => (
      <ChatProvider>
        <ToolCallBlock
          block={block}
          messageId="message-1"
          blockIndex={0}
        />
      </ChatProvider>
    ));

    expect(html).toContain('chat-tool-call-header-button');
    expect(html).toContain('aria-controls=');
    expect(html).toContain('aria-expanded="false"');
  });
});
