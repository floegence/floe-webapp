import { createSignal, createEffect, onCleanup, type Accessor, type Component } from 'solid-js';
import { createSimpleContext } from './createSimpleContext';
import { useResolvedFloeConfig } from './FloeConfigContext';
import { formatKeybind, matchKeybind, parseKeybind, type ParsedKeybind } from '../utils/keybind';
import { deferAfterPaint, deferNonBlocking } from '../utils/defer';
import { shouldIgnoreHotkeys } from '../utils/dom';

export interface Command {
  id: string;
  title: string;
  description?: string;
  icon?: Component<{ class?: string }>;
  keybind?: string;
  category?: string;
  execute: () => void | Promise<void>;
}

export interface CommandContextValue {
  // State
  isOpen: Accessor<boolean>;
  search: Accessor<string>;
  commands: Accessor<Command[]>;
  filteredCommands: Accessor<Command[]>;

  // Actions
  open: () => void;
  close: () => void;
  toggle: () => void;
  setSearch: (value: string) => void;
  register: (command: Command) => () => void;
  registerAll: (commands: Command[]) => () => void;
  execute: (id: string) => void;
  getKeybindDisplay: (keybind: string) => string;
}

export function createCommandService(): CommandContextValue {
  const floe = useResolvedFloeConfig();
  const cfg = () => floe.config.commands;
  const commandsMap = new Map<string, Command>();
  const parsedKeybinds = new Map<string, ParsedKeybind>();

  const [isOpen, setIsOpen] = createSignal(false);
  const [search, setSearch] = createSignal('');
  const [searchApplied, setSearchApplied] = createSignal('');
  const [commands, setCommands] = createSignal<Command[]>([]);

  const syncCommands = () => {
    setCommands(Array.from(commandsMap.values()));
  };

  // Global keybind listener
  if (typeof window !== 'undefined' && cfg().enableGlobalKeybinds) {
    const handleKeydown = (e: KeyboardEvent) => {
      const c = cfg();

      // Save (Cmd/Ctrl+S) is expected to work even while typing.
      if (c.save.enabled && matchKeybind(e, c.save.keybind)) {
        const saveCommand = commandsMap.get(c.save.commandId);
        if (saveCommand) {
          e.preventDefault();
          deferNonBlocking(() => {
            void Promise.resolve(saveCommand.execute()).catch((err) => console.error(err));
          });
        } else if (c.save.preventDefaultWhenNoHandler) {
          e.preventDefault();
        }
        return;
      }

      if (shouldIgnoreHotkeys(e, { ignoreWhenTyping: c.ignoreWhenTyping, allowWhenTypingWithin: c.allowWhenTypingWithin })) {
        return;
      }

      // Command palette shortcut (Cmd/Ctrl + K)
      if (c.palette.enabled && matchKeybind(e, c.palette.keybind)) {
        e.preventDefault();
        setIsOpen((v) => !v);
        return;
      }

      // Check registered command keybinds
      if (!isOpen()) {
        for (const command of commandsMap.values()) {
          if (!command.keybind) continue;
          const parsed = parsedKeybinds.get(command.id);
          if (parsed && matchKeybind(e, parsed)) {
            e.preventDefault();
            deferNonBlocking(() => {
              void Promise.resolve(command.execute()).catch((err) => console.error(err));
            });
            return;
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeydown);
    onCleanup(() => window.removeEventListener('keydown', handleKeydown));
  }

  // UI-first search: apply the query after a paint so typing never blocks the input event.
  // Coalesce rapid updates and only apply the latest query.
  let searchApplyJob = 0;
  createEffect(() => {
    const next = search().trim();
    searchApplyJob += 1;
    const jobId = searchApplyJob;

    if (!next) {
      setSearchApplied('');
      return;
    }

    deferAfterPaint(() => {
      if (jobId !== searchApplyJob) return;
      setSearchApplied(next.toLowerCase());
    });
  });

  let lastFilterQuery = '';
  let lastFilterCommands: Command[] | null = null;
  let lastFilterResult: Command[] = [];

  const filteredCommands = () => {
    const all = commands();
    const query = searchApplied();

    if (all === lastFilterCommands && query === lastFilterQuery) return lastFilterResult;

    lastFilterCommands = all;
    lastFilterQuery = query;

    if (!query) {
      lastFilterResult = all;
      return all;
    }

    lastFilterResult = all.filter(
      (cmd) =>
        cmd.title.toLowerCase().includes(query) ||
        cmd.description?.toLowerCase().includes(query) ||
        cmd.category?.toLowerCase().includes(query)
    );
    return lastFilterResult;
  };

  return {
    // State
    isOpen,
    search,
    commands,
    filteredCommands,

    // Actions
    open: () => setIsOpen(true),
    close: () => {
      setIsOpen(false);
      setSearch('');
    },
    toggle: () => setIsOpen((v) => !v),
    setSearch: (value: string) => setSearch(value),

    register: (command: Command) => {
      commandsMap.set(command.id, command);
      if (command.keybind) {
        parsedKeybinds.set(command.id, parseKeybind(command.keybind));
      }
      syncCommands();
      // Return unregister function
      return () => {
        commandsMap.delete(command.id);
        parsedKeybinds.delete(command.id);
        syncCommands();
      };
    },

    registerAll: (commands: Command[]) => {
      commands.forEach((cmd) => {
        commandsMap.set(cmd.id, cmd);
        if (cmd.keybind) {
          parsedKeybinds.set(cmd.id, parseKeybind(cmd.keybind));
        }
      });
      syncCommands();
      // Return unregister function
      return () => {
        commands.forEach((cmd) => {
          commandsMap.delete(cmd.id);
          parsedKeybinds.delete(cmd.id);
        });
        syncCommands();
      };
    },

    execute: (id: string) => {
      const command = commandsMap.get(id);
      if (!command) return;

      // Close UI first, then run command in the next task to avoid blocking paint.
      setIsOpen(false);
      setSearch('');
      deferNonBlocking(() => {
        void Promise.resolve(command.execute()).catch((err) => console.error(err));
      });
    },

    getKeybindDisplay: formatKeybind,
  };
}

export const { Provider: CommandProvider, use: useCommand } = createSimpleContext<CommandContextValue>({
  name: 'Command',
  init: createCommandService,
});
