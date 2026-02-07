import { createEffect, onCleanup, type Accessor } from 'solid-js';
import { useCommand, type Command, type CommandContextValue } from '../context/CommandContext';

export type CommandContributionsInput = Command[] | Accessor<Command[]>;

function resolveCommandList(input: CommandContributionsInput): Command[] {
  if (typeof input === 'function') {
    return input();
  }
  return input;
}

/**
 * Register command contributions and return a disposer.
 *
 * This helper is useful for tests and custom lifecycle integrations.
 */
export function registerCommandContributions(
  commandService: Pick<CommandContextValue, 'registerAll'>,
  commands: Command[]
): () => void {
  const dedupedById = new Map<string, Command>();
  commands.forEach((cmd) => {
    const id = String(cmd.id ?? '').trim();
    if (!id) return;
    dedupedById.set(id, { ...cmd, id });
  });
  return commandService.registerAll(Array.from(dedupedById.values()));
}

/**
 * Declarative command registration with automatic cleanup.
 *
 * Accepts either a static command array or a reactive accessor.
 * When the list changes, previous commands are unregistered first.
 */
export function useCommandContributions(input: CommandContributionsInput): void {
  const commandService = useCommand();

  createEffect(() => {
    const list = resolveCommandList(input);
    const unregister = registerCommandContributions(commandService, list);
    onCleanup(() => unregister());
  });
}
