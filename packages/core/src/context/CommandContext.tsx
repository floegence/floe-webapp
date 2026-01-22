import { createSignal, onCleanup, type Accessor, type Component } from 'solid-js';
import { createSimpleContext } from './createSimpleContext';
import { formatKeybind, matchKeybind, parseKeybind, type ParsedKeybind } from '../utils/keybind';

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
  const commandsMap = new Map<string, Command>();
  const parsedKeybinds = new Map<string, ParsedKeybind>();

  const [isOpen, setIsOpen] = createSignal(false);
  const [search, setSearch] = createSignal('');
  const [commands, setCommands] = createSignal<Command[]>([]);

  const deferNonBlocking = (fn: () => void) => {
    setTimeout(fn, 0);
  };

  const syncCommands = () => {
    setCommands(Array.from(commandsMap.values()));
  };

  // Global keybind listener
  if (typeof window !== 'undefined') {
    const handleKeydown = (e: KeyboardEvent) => {
      // Always prevent browser save dialog for Cmd/Ctrl+S
      // This must come first to ensure the browser dialog never shows
      if (matchKeybind(e, 'mod+s')) {
        e.preventDefault();
        // Check if there's a registered save command, execute it
        const saveCommand = commandsMap.get('file.save');
        if (saveCommand) {
          deferNonBlocking(() => {
            void Promise.resolve(saveCommand.execute()).catch((err) => console.error(err));
          });
        }
        return;
      }

      // Command palette shortcut (Cmd/Ctrl + K)
      if (matchKeybind(e, 'mod+k')) {
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

  let lastFilterQuery = '';
  let lastFilterCommands: Command[] | null = null;
  let lastFilterResult: Command[] = [];

  const filteredCommands = () => {
    const all = commands();
    const query = search().toLowerCase().trim();

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
