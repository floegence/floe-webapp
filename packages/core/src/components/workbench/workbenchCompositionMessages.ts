import { createContext, useContext, type Accessor } from 'solid-js';

export const workbenchCompositionMessages = {
  dragSticky: 'Drag sticky note',
  stickyBody: 'Sticky note body',
  copySticky: 'Copy sticky note content',
  copiedSticky: 'Sticky note content copied',
  stickyColor: 'Use sticky color {value}',
  stickyMaterial: 'Sticky material',
  useStickyMaterial: 'Use sticky material {value}',
  done: 'Done',
  deleteSticky: 'Delete sticky note',
  resizeSticky: 'Resize sticky note',
  regionName: 'Region name',
  editName: 'Edit name',
  addName: 'Add name',
  clearName: 'Clear name',
  moveText: 'Move text',
  chooseFont: 'Choose bold font',
  boldFont: 'Bold font',
  useFont: 'Use {value} bold font',
  fontPreview: '{value} bold',
  textContent: 'Canvas text',
  textSize: 'Text size',
  decreaseSize: 'Decrease text size',
  sizeValue: 'Text size value',
  increaseSize: 'Increase text size',
  textColor: 'Use text color {value}',
  insertEmoji: 'Insert emoji',
  emoji: 'Emoji',
  useEmoji: 'Insert emoji {value}',
  deleteText: 'Delete text',
  resizeText: 'Resize text',
  regionColor: 'Use region color {value}',
  regionMaterial: 'Region material',
  useRegionMaterial: 'Use region material {value}',
  deleteRegion: 'Delete background region',
  resizeRegion: 'Resize background region',
  tint: 'Tint',
  tab: 'Tab',
  ruled: 'Ruled',
  solid: 'Color field',
  frame: 'Outline',
  hatched: 'Hatch',
  dotted: 'Dotted',
  grid: 'Grid',
  glass: 'Wash',
  amber: 'Amber',
  sage: 'Sage',
  azure: 'Azure',
  coral: 'Coral',
  rose: 'Rose',
  graphite: 'Graphite',
  serif: 'Serif',
  sans: 'Sans',
  round: 'Round',
  mono: 'Mono',
  condensed: 'Condensed',
} as const;

export type WorkbenchCompositionMessageKey = keyof typeof workbenchCompositionMessages;
export type WorkbenchCompositionMessages = Record<WorkbenchCompositionMessageKey, string>;
export const WorkbenchCompositionMessagesContext =
  createContext<Accessor<Partial<WorkbenchCompositionMessages> | undefined>>();
export function useWorkbenchCompositionText() {
  const messages = useContext(WorkbenchCompositionMessagesContext);
  return (key: WorkbenchCompositionMessageKey, value = '') =>
    (messages?.()?.[key] ?? workbenchCompositionMessages[key]).replace('{value}', value);
}
