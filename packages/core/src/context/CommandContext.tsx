import { createSignal, onCleanup, type Accessor, type Component } from 'solid-js';
import { createSimpleContext } from './createSimpleContext';
import { useResolvedFloeConfig } from './FloeConfigContext';
import { formatKeybind, matchKeybind, parseKeybind, type ParsedKeybind } from '../utils/keybind';
import { deferNonBlocking } from '../utils/defer';

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
  const [commands, setCommands] = createSignal<Command[]>([]);

  const syncCommands = () => {
    setCommands(Array.from(commandsMap.values()));
  };

  // Global keybind listener
  if (typeof window !== 'undefined' && cfg().enableGlobalKeybinds) {
    const isTypingElement = (el: Element | null): boolean => {
      if (!el || !(el instanceof HTMLElement)) return false;
      const tag = el.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
      if (el.isContentEditable) return true;
      // Some editors use role="textbox" on non-input elements.
      if (el.getAttribute('role') === 'textbox') return true;
      return false;
    };

    const shouldIgnoreHotkeys = (e: KeyboardEvent): boolean => {
      const c = cfg();
      if (!c.ignoreWhenTyping) return false;

      const el = (e.target as Element | null) ?? (typeof document !== 'undefined' ? document.activeElement : null);
      if (!isTypingElement(el)) return false;

      // Allow opt-in containers (e.g. code editor).
      if (c.allowWhenTypingWithin && el instanceof Element && el.closest(c.allowWhenTypingWithin)) {
        return false;
      }

      return true;
    };

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

      if (shouldIgnoreHotkeys(e)) return;

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
