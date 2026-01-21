import { describe, expect, it } from 'vitest';
import { createLayoutService } from '../src/context/LayoutContext';
import { withSolidRoot } from './withSolidRoot';

describe('createLayoutService', () => {
  it('should clamp sidebar width and terminal height', async () => {
    await withSolidRoot(() => {
      const layout = createLayoutService();

      layout.setSidebarWidth(100);
      expect(layout.sidebarWidth()).toBe(200);

      layout.setSidebarWidth(999);
      expect(layout.sidebarWidth()).toBe(400);

      layout.setTerminalHeight(10);
      expect(layout.terminalHeight()).toBe(150);

      layout.setTerminalHeight(9999);
      expect(layout.terminalHeight()).toBe(600);
    });
  });

  it('should un-collapse when selecting active tab', async () => {
    await withSolidRoot(() => {
      const layout = createLayoutService();

      layout.setSidebarCollapsed(true);
      expect(layout.sidebarCollapsed()).toBe(true);

      layout.setSidebarActiveTab('files');
      expect(layout.sidebarActiveTab()).toBe('files');
      expect(layout.sidebarCollapsed()).toBe(false);
    });
  });

  it('toggleTerminal should flip terminal open state', async () => {
    await withSolidRoot(() => {
      const layout = createLayoutService();
      const initial = layout.terminalOpened();

      layout.toggleTerminal();
      expect(layout.terminalOpened()).toBe(!initial);

      layout.toggleTerminal();
      expect(layout.terminalOpened()).toBe(initial);
    });
  });
});

