import { describe, expect, it, vi } from 'vitest';
import { createComponentRegistry, type ComponentContext, type FloeComponent } from '../src/context/ComponentRegistry';
import { createCommandService } from '../src/context/CommandContext';
import { createLayoutService } from '../src/context/LayoutContext';
import { createNotificationService } from '../src/context/NotificationContext';
import { createThemeService } from '../src/context/ThemeContext';
import { withSolidRoot } from './withSolidRoot';

function createTestContext(overrides?: Partial<ComponentContext>): ComponentContext {
  const theme = createThemeService();
  const layout = createLayoutService();
  const commands = createCommandService();
  const notifications = createNotificationService();

  return {
    protocol: undefined,
    theme,
    layout,
    commands,
    notifications,
    storage: {
      get: (_key, defaultValue) => defaultValue,
      set: () => {},
      remove: () => {},
    },
    logger: {
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {},
    },
    ...overrides,
  };
}

describe('createComponentRegistry', () => {
  it('sidebarItems should be sorted by order and only include sidebar components', async () => {
    await withSolidRoot(() => {
      const registry = createComponentRegistry();

      const a: FloeComponent = {
        id: 'a',
        name: 'A',
        component: () => null,
        sidebar: { order: 2 },
      };
      const b: FloeComponent = {
        id: 'b',
        name: 'B',
        component: () => null,
        sidebar: { order: 1 },
      };
      const c: FloeComponent = {
        id: 'c',
        name: 'C',
        component: () => null,
      };

      registry.registerAll([a, b, c]);
      expect(registry.sidebarItems().map((i) => i.id)).toEqual(['b', 'a']);
    });
  });

  it('mount should register component commands and unmount should cleanup', async () => {
    await withSolidRoot(async () => {
      const registry = createComponentRegistry();
      const ctx = createTestContext({ protocol: { tag: 'proto' } });

      const exec = vi.fn();
      const comp: FloeComponent = {
        id: 'files',
        name: 'Files',
        component: () => null,
        sidebar: { order: 1 },
        commands: [
          {
            id: 'files.hello',
            title: 'Hello',
            category: 'Test',
            execute: (c) => exec(c.protocol),
          },
        ],
      };

      registry.register(comp);
      await registry.mount('files', ctx);

      expect(ctx.commands.commands().map((c) => c.id)).toEqual(['files.hello']);
      ctx.commands.execute('files.hello');
      expect(exec).toHaveBeenCalledWith({ tag: 'proto' });

      await registry.unmount('files');
      expect(ctx.commands.commands()).toEqual([]);
      expect(registry.mountedComponents().has('files')).toBe(false);
    });
  });

  it('mount should rollback registered commands when onMount throws', async () => {
    await withSolidRoot(async () => {
      const registry = createComponentRegistry();
      const ctx = createTestContext();

      const comp: FloeComponent = {
        id: 'bad',
        name: 'Bad',
        component: () => null,
        commands: [
          {
            id: 'bad.cmd',
            title: 'Bad Command',
            execute: vi.fn(),
          },
        ],
        onMount: () => {
          throw new Error('boom');
        },
      };

      registry.register(comp);

      await expect(registry.mount('bad', ctx)).rejects.toThrow('boom');
      expect(ctx.commands.commands()).toEqual([]);
      expect(registry.mountedComponents().has('bad')).toBe(false);
    });
  });
});

