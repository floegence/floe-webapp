import type { MessageBlock, StreamEvent } from './types';

export interface StreamEventBuilder {
  messageStart: () => StreamEvent;
  blockStart: (blockIndex: number, blockType: MessageBlock['type']) => StreamEvent;
  blockDelta: (blockIndex: number, delta: string) => StreamEvent;
  blockSet: (blockIndex: number, block: MessageBlock) => StreamEvent;
  blockEnd: (blockIndex: number) => StreamEvent;
  messageEnd: () => StreamEvent;
  error: (error: string) => StreamEvent;
}

function isNonNegativeInteger(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0;
}

function isMessageBlock(v: unknown): v is MessageBlock {
  return !!v && typeof v === 'object' && typeof (v as Record<string, unknown>).type === 'string';
}

function isString(v: unknown): v is string {
  return typeof v === 'string';
}

/**
 * Runtime validator for stream events.
 *
 * Useful when decoding events from JSON lines / untyped transports.
 */
export function isStreamEvent(v: unknown): v is StreamEvent {
  if (!v || typeof v !== 'object') return false;
  const e = v as Record<string, unknown>;
  const messageId = e.messageId;
  if (!isString(messageId) || !messageId.trim()) return false;

  switch (e.type) {
    case 'message-start':
    case 'message-end':
      return true;
    case 'block-start':
      return isNonNegativeInteger(e.blockIndex) && isString(e.blockType);
    case 'block-delta':
      return isNonNegativeInteger(e.blockIndex) && isString(e.delta);
    case 'block-set':
      return isNonNegativeInteger(e.blockIndex) && isMessageBlock(e.block);
    case 'block-end':
      return isNonNegativeInteger(e.blockIndex);
    case 'error':
      return isString(e.error);
    default:
      return false;
  }
}

/**
 * Typed stream-event factory for a single assistant message.
 */
export function createStreamEventBuilder(messageId: string): StreamEventBuilder {
  const id = String(messageId ?? '').trim();
  if (!id) {
    throw new Error('messageId is required');
  }

  return {
    messageStart: () => ({ type: 'message-start', messageId: id }),
    blockStart: (blockIndex, blockType) => ({ type: 'block-start', messageId: id, blockIndex, blockType }),
    blockDelta: (blockIndex, delta) => ({ type: 'block-delta', messageId: id, blockIndex, delta }),
    blockSet: (blockIndex, block) => ({ type: 'block-set', messageId: id, blockIndex, block }),
    blockEnd: (blockIndex) => ({ type: 'block-end', messageId: id, blockIndex }),
    messageEnd: () => ({ type: 'message-end', messageId: id }),
    error: (error) => ({ type: 'error', messageId: id, error }),
  };
}

/**
 * Append a local notice to the current assistant text block and close the message.
 *
 * This is commonly used for watchdog timeouts / disconnected fallbacks.
 */
export function buildAssistantNoticeEvents(args: {
  messageId: string;
  notice: string;
  blockIndex?: number;
  prefix?: string;
  includeMessageEnd?: boolean;
}): StreamEvent[] {
  const builder = createStreamEventBuilder(args.messageId);
  const notice = String(args.notice ?? '');
  const blockIndex = args.blockIndex ?? 0;
  if (!notice) {
    return args.includeMessageEnd === false ? [] : [builder.messageEnd()];
  }

  const delta = `${args.prefix ?? ''}${notice}`;
  const events: StreamEvent[] = [builder.blockDelta(blockIndex, delta)];
  if (args.includeMessageEnd !== false) {
    events.push(builder.messageEnd());
  }
  return events;
}
