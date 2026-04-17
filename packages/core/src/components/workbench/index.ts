export {
  WorkbenchOverlay,
  type WorkbenchOverlayProps,
} from './WorkbenchOverlay';
export {
  WorkbenchSurface,
  type WorkbenchSurfaceProps,
} from './WorkbenchSurface';
export {
  WorkbenchContextMenu,
  type WorkbenchContextMenuItem,
  type WorkbenchContextMenuProps,
} from './WorkbenchContextMenu';
export { useWorkbenchModel, type UseWorkbenchModelOptions } from './useWorkbenchModel';
export { WIDGET_REGISTRY, getWidgetEntry, type WidgetRegistryEntry } from './widgets/widgetRegistry';
export * from './types';
export {
  sanitizeWorkbenchState,
  createDefaultWorkbenchState,
  createWorkbenchId,
} from './workbenchHelpers';
