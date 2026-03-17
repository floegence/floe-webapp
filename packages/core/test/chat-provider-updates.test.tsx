import { describe, expect, it, vi } from 'vitest';
import { renderToString } from 'solid-js/web';
import { ChatProvider, useChatContext } from '../src/components/chat/ChatProvider';
import type { Message } from '../src/components/chat/types';

describe('ChatProvider fine-grained updates', () => {
  it('should keep stream event behavior consistent while updating a single message incrementally', () => {
    const originalRAF = globalThis.requestAnimationFrame;
    const originalCancelRAF = globalThis.cancelAnimationFrame;
    const rafQueue: FrameRequestCallback[] = [];

    globalThis.requestAnimationFrame = ((callback: FrameRequestCallback) => {
      rafQueue.push(callback);
      return rafQueue.length;
    }) as typeof requestAnimationFrame;
    globalThis.cancelAnimationFrame = (() => undefined) as typeof cancelAnimationFrame;

    try {
      function Harness() {
        const ctx = useChatContext();

        ctx.handleStreamEvent({ type: 'message-start', messageId: 'm1' });
        ctx.handleStreamEvent({ type: 'block-start', messageId: 'm1', blockType: 'text' });
        ctx.handleStreamEvent({ type: 'block-delta', messageId: 'm1', blockIndex: 0, delta: 'Hello' });
        ctx.handleStreamEvent({ type: 'block-delta', messageId: 'm1', blockIndex: 0, delta: ' Solid' });
        ctx.handleStreamEvent({ type: 'message-end', messageId: 'm1' });
        while (rafQueue.length > 0) {
          const callback = rafQueue.shift();
          if (callback) callback(0);
        }

        const message = ctx.messages().find((item) => item.id === 'm1');
        expect(message?.status).toBe('complete');
        expect(message?.blocks).toHaveLength(1);
        expect(message?.blocks[0]).toEqual({ type: 'text', content: 'Hello Solid' });
        expect(ctx.streamingMessageId()).toBe(null);

        return null;
      }

      renderToString(() => (
        <ChatProvider>
          <Harness />
        </ChatProvider>
      ));
    } finally {
      globalThis.requestAnimationFrame = originalRAF;
      globalThis.cancelAnimationFrame = originalCancelRAF;
    }
  });

  it('should keep tool-call collapse, approval, and checklist toggles consistent', () => {
    const onToolApproval = vi.fn();
    const onChecklistChange = vi.fn();

    const initialMessages: Message[] = [
      {
        id: 'assistant-1',
        role: 'assistant',
        status: 'complete',
        timestamp: Date.now(),
        blocks: [
          {
            type: 'tool-call',
            toolName: 'exec',
            toolId: 'tool-1',
            args: {},
            status: 'pending',
            requiresApproval: true,
            approvalState: 'required',
          },
          {
            type: 'checklist',
            items: [
              { id: 'task-1', text: 'First', checked: false },
              { id: 'task-2', text: 'Second', checked: true },
            ],
          },
        ],
      },
    ];

    function Harness() {
      const ctx = useChatContext();

      ctx.toggleToolCollapse('assistant-1', 'tool-1');
      let toolBlock = ctx.messages()[0]?.blocks[0];
      expect(toolBlock?.type).toBe('tool-call');
      if (!toolBlock || toolBlock.type !== 'tool-call') throw new Error('Expected tool-call block');
      expect(toolBlock.collapsed).toBe(false);

      ctx.toggleToolCollapse('assistant-1', 'tool-1');
      toolBlock = ctx.messages()[0]?.blocks[0];
      expect(toolBlock?.type).toBe('tool-call');
      if (!toolBlock || toolBlock.type !== 'tool-call') throw new Error('Expected tool-call block');
      expect(toolBlock.collapsed).toBe(true);

      ctx.approveToolCall('assistant-1', 'tool-1', true);
      toolBlock = ctx.messages()[0]?.blocks[0];
      expect(toolBlock?.type).toBe('tool-call');
      if (!toolBlock || toolBlock.type !== 'tool-call') throw new Error('Expected tool-call block');
      expect(toolBlock.approvalState).toBe('approved');
      expect(toolBlock.status).toBe('running');

      ctx.toggleChecklistItem('assistant-1', 1, 'task-1');
      const checklistBlock = ctx.messages()[0]?.blocks[1];
      expect(checklistBlock?.type).toBe('checklist');
      if (!checklistBlock || checklistBlock.type !== 'checklist') throw new Error('Expected checklist block');
      expect(checklistBlock.items[0]?.checked).toBe(true);
      expect(checklistBlock.items[1]?.checked).toBe(true);

      return null;
    }

    renderToString(() => (
      <ChatProvider
        initialMessages={initialMessages}
        callbacks={{ onToolApproval, onChecklistChange }}
      >
        <Harness />
      </ChatProvider>
    ));
  });
});
