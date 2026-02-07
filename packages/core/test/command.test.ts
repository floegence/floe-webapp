import { describe, expect, it, vi } from 'vitest';
import { createCommandService } from '../src/context/CommandContext';
import { registerCommandContributions } from '../src/hooks/useCommandContributions';
import { withSolidRoot } from './withSolidRoot';

describe('createCommandService', () => {
  it('register/registerAll should update command list and unregister should cleanup', async () => {
    await withSolidRoot(() => {
      const service = createCommandService();

      const single = vi.fn();
      const disposeSingle = service.register({
        id: 'cmd.single',
        title: 'Single',
        execute: single,
      });

      expect(service.commands().map((c) => c.id)).toEqual(['cmd.single']);

      const a = vi.fn();
      const b = vi.fn();
      const disposeMany = service.registerAll([
        { id: 'cmd.a', title: 'A', execute: a },
        { id: 'cmd.b', title: 'B', execute: b },
      ]);

      expect(service.commands().map((c) => c.id)).toEqual(['cmd.single', 'cmd.a', 'cmd.b']);

      disposeMany();
      expect(service.commands().map((c) => c.id)).toEqual(['cmd.single']);

      disposeSingle();
      expect(service.commands()).toEqual([]);
    });
  });

  it('registerCommandContributions should dedupe duplicate command ids', async () => {
    await withSolidRoot(() => {
      const service = createCommandService();

      const dispose = registerCommandContributions(service, [
        { id: 'cmd.toggle', title: 'Toggle #1', execute: vi.fn() },
        { id: 'cmd.toggle', title: 'Toggle #2', execute: vi.fn() },
        { id: '   ', title: 'Invalid', execute: vi.fn() },
      ]);

      expect(service.commands().map((c) => c.id)).toEqual(['cmd.toggle']);
      expect(service.commands()[0]?.title).toBe('Toggle #2');

      dispose();
      expect(service.commands()).toEqual([]);
    });
  });

  it('filter should match title/description/category', async () => {
    await withSolidRoot(() => {
      const service = createCommandService();

      service.register({
        id: 'cmd.toggle-theme',
        title: 'Toggle Theme',
        description: 'Switch between light and dark',
        category: 'Appearance',
        execute: vi.fn(),
      });

      service.setSearch('toggle');
      expect(service.filteredCommands().map((c) => c.id)).toEqual(['cmd.toggle-theme']);

      service.setSearch('appearance');
      expect(service.filteredCommands().map((c) => c.id)).toEqual(['cmd.toggle-theme']);

      service.setSearch('dark');
      expect(service.filteredCommands().map((c) => c.id)).toEqual(['cmd.toggle-theme']);
    });
  });

  it('execute should run command and reset open/search', async () => {
    await withSolidRoot(async () => {
      const service = createCommandService();
      const run = vi.fn();

      service.register({
        id: 'cmd.run',
        title: 'Run',
        execute: run,
      });

      service.open();
      service.setSearch('run');
      service.execute('cmd.run');

      expect(service.isOpen()).toBe(false);
      expect(service.search()).toBe('');

      // Command execution is deferred to avoid blocking paint.
      expect(run).toHaveBeenCalledTimes(0);
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(run).toHaveBeenCalledTimes(1);
    });
  });
});
