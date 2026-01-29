import { type Component, For } from 'solid-js';
import { cn } from '../../../utils/cn';
import { useChatContext } from '../ChatProvider';
import type { ChecklistItem } from '../types';

export interface ChecklistBlockProps {
  items: ChecklistItem[];
  messageId: string;
  blockIndex: number;
  class?: string;
}

export const ChecklistBlock: Component<ChecklistBlockProps> = (props) => {
  const ctx = useChatContext();

  const handleToggle = (itemId: string) => {
    ctx.toggleChecklistItem(props.messageId, props.blockIndex, itemId);
  };

  return (
    <div class={cn('chat-checklist-block', props.class)}>
      <ul class="chat-checklist">
        <For each={props.items}>
          {(item) => (
            <li class="chat-checklist-item">
              <label class="chat-checklist-label">
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={() => handleToggle(item.id)}
                  class="chat-checklist-checkbox"
                />
                <span
                  class={cn(
                    'chat-checklist-text',
                    item.checked && 'chat-checklist-text-checked'
                  )}
                >
                  {item.text}
                </span>
              </label>
            </li>
          )}
        </For>
      </ul>
    </div>
  );
};
