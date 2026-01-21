import { onCleanup, type Accessor, type Component } from 'solid-js';
import { createStore, produce } from 'solid-js/store';
import { createSimpleContext } from './createSimpleContext';
import { matchKeybind, formatKeybind } from '../utils/keybind';

export interface Command {
  id: string;
  title: string;
  description?: string;
  icon?: Component<{ class?: string }>;
  keybind?: string;
  category?: string;
  execute: () => void | Promise<void>;
}

interface CommandStore {
  commands: Map<string, Command>;
  open: boolean;
  search: string;
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
  const [store, setStore] = createStore<CommandStore>({
    commands: new Map(),
    open: false,
    search: '',
  });

  // Global keybind listener
  if (typeof window !== 'undefined') {
    const handleKeydown = (e: KeyboardEvent) => {
      // Command palette shortcut (Cmd/Ctrl + K)
      if (matchKeybind(e, 'mod+k')) {
        e.preventDefault();
        setStore('open', (v) => !v);
        return;
      }

      // Check registered command keybinds
      if (!store.open) {
        for (const command of store.commands.values()) {
          if (command.keybind && matchKeybind(e, command.keybind)) {
            e.preventDefault();
            command.execute();
            return;
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeydown);
    onCleanup(() => window.removeEventListener('keydown', handleKeydown));
  }

  // Filter commands based on search
  const filteredCommands = () => {
    const allCommands = Array.from(store.commands.values());
    const query = store.search.toLowerCase().trim();

    if (!query) return allCommands;

    return allCommands.filter(
      (cmd) =>
        cmd.title.toLowerCase().includes(query) ||
        cmd.description?.toLowerCase().includes(query) ||
        cmd.category?.toLowerCase().includes(query)
    );
  };

  return {
    // State
    isOpen: () => store.open,
    search: () => store.search,
    commands: () => Array.from(store.commands.values()),
    filteredCommands,

    // Actions
    open: () => setStore('open', true),
    close: () => {
      setStore('open', false);
      setStore('search', '');
    },
    toggle: () => setStore('open', (v) => !v),
    setSearch: (value: string) => setStore('search', value),

    register: (command: Command) => {
      setStore(
        produce((s) => {
          s.commands.set(command.id, command);
        })
      );
      // Return unregister function
      return () => {
        setStore(
          produce((s) => {
            s.commands.delete(command.id);
          })
        );
      };
    },

    registerAll: (commands: Command[]) => {
      setStore(
        produce((s) => {
          commands.forEach((cmd) => s.commands.set(cmd.id, cmd));
        })
      );
      // Return unregister function
      return () => {
        setStore(
          produce((s) => {
            commands.forEach((cmd) => s.commands.delete(cmd.id));
          })
        );
      };
    },

    execute: (id: string) => {
      const command = store.commands.get(id);
      if (command) {
        command.execute();
        setStore('open', false);
        setStore('search', '');
      }
    },

    getKeybindDisplay: formatKeybind,
  };
}

export const { Provider: CommandProvider, use: useCommand } = createSimpleContext<CommandContextValue>({
  name: 'Command',
  init: createCommandService,
});
