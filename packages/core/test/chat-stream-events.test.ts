import { describe, expect, it } from 'vitest';
import {
  buildAssistantNoticeEvents,
  createStreamEventBuilder,
  isStreamEvent,
} from '../src/components/chat/streamEvents';

describe('chat stream event helpers', () => {
  it('createStreamEventBuilder should build typed events for one message', () => {
    const builder = createStreamEventBuilder('msg-1');

    expect(builder.messageStart()).toEqual({ type: 'message-start', messageId: 'msg-1' });
    expect(builder.blockStart(0, 'markdown')).toEqual({
      type: 'block-start',
      messageId: 'msg-1',
      blockIndex: 0,
      blockType: 'markdown',
    });
    expect(builder.blockDelta(0, 'hello')).toEqual({
      type: 'block-delta',
      messageId: 'msg-1',
      blockIndex: 0,
      delta: 'hello',
    });
    expect(builder.blockSet(0, { type: 'text', content: 'hello' })).toEqual({
      type: 'block-set',
      messageId: 'msg-1',
      blockIndex: 0,
      block: { type: 'text', content: 'hello' },
    });
    expect(builder.blockEnd(0)).toEqual({ type: 'block-end', messageId: 'msg-1', blockIndex: 0 });
    expect(builder.messageEnd()).toEqual({ type: 'message-end', messageId: 'msg-1' });
    expect(builder.error('boom')).toEqual({ type: 'error', messageId: 'msg-1', error: 'boom' });
  });

  it('createStreamEventBuilder should reject empty message id', () => {
    expect(() => createStreamEventBuilder('   ')).toThrowError('messageId is required');
  });

  it('isStreamEvent should validate decoded objects', () => {
    expect(isStreamEvent({ type: 'message-start', messageId: 'm1' })).toBe(true);
    expect(isStreamEvent({ type: 'block-start', messageId: 'm1', blockIndex: 0, blockType: 'markdown' })).toBe(true);
    expect(isStreamEvent({ type: 'block-delta', messageId: 'm1', blockIndex: 0, delta: 'x' })).toBe(true);
    expect(isStreamEvent({ type: 'block-set', messageId: 'm1', blockIndex: 0, block: { type: 'text', content: 'x' } })).toBe(true);
    expect(isStreamEvent({ type: 'message-end', messageId: 'm1' })).toBe(true);

    expect(isStreamEvent({ type: 'block-start', messageId: 'm1', blockIndex: -1, blockType: 'markdown' })).toBe(false);
    expect(isStreamEvent({ type: 'block-delta', messageId: 'm1', blockIndex: 0, delta: 1 })).toBe(false);
    expect(isStreamEvent({ type: 'message-end', messageId: '' })).toBe(false);
    expect(isStreamEvent({ type: 'unknown', messageId: 'm1' })).toBe(false);
    expect(isStreamEvent(null)).toBe(false);
  });

  it('buildAssistantNoticeEvents should append notice and end message by default', () => {
    expect(
      buildAssistantNoticeEvents({
        messageId: 'm1',
        notice: 'Disconnected.',
        prefix: '\n\n',
      })
    ).toEqual([
      { type: 'block-delta', messageId: 'm1', blockIndex: 0, delta: '\n\nDisconnected.' },
      { type: 'message-end', messageId: 'm1' },
    ]);
  });

  it('buildAssistantNoticeEvents should allow delta-only fallback', () => {
    expect(
      buildAssistantNoticeEvents({
        messageId: 'm1',
        notice: 'Timeout',
        includeMessageEnd: false,
      })
    ).toEqual([{ type: 'block-delta', messageId: 'm1', blockIndex: 0, delta: 'Timeout' }]);
  });
});
