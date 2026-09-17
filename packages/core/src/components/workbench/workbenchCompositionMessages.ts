import type { WorkbenchSelection } from './types';
import { createContext, useContext, type Accessor } from 'solid-js';

export const workbenchCompositionMessages = {
  stickyTitle: 'Sticky note title',
  edit: 'Edit text',
  duplicate: 'Duplicate',
  treatment: 'Treatment',
  treatmentHint: 'Preview in the current color',
  tintDescription: 'Color across the whole note',
  tabDescription: 'A quiet card with a color stripe',
  ruledDescription: 'Paper lines for longer thoughts',
  solidDescription: 'A color field to define a space',
  frameDescription: 'A clear boundary with an open center',
  hatchedDescription: 'A subtle texture for a distinct purpose',
  dottedDescription: 'A field of evenly spaced dots',
  gridDescription: 'A grid for arranging content',
  glassDescription: 'A soft wash of color',
  typography: 'Typography',
  title: 'Title',
  heading: 'Heading',
  body: 'Body',
  caption: 'Caption',
  left: 'Left',
  center: 'Center',
  right: 'Right',
  more: 'More options',
  opacity: 'Opacity',
  textPlaceholder: 'Write something…',
  regionPlaceholder: 'Name this region…',
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
  moveRegion: 'Move region',
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
  tint: 'Soft fill',
  tab: 'Side stripe',
  ruled: 'Lined paper',
  solid: 'Color field',
  frame: 'Outline',
  hatched: 'Fine hatch',
  dotted: 'Dotted',
  grid: 'Grid',
  glass: 'Wash',
  amber: 'Amber',
  sage: 'Sage',
  azure: 'Azure',
  coral: 'Coral',
  rose: 'Rose',
  graphite: 'Graphite',
  system: 'System',
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

/** The model remains the owner of object creation and selection. */
export const WorkbenchCompositionActionsContext = createContext<{
  duplicate: (selection: WorkbenchSelection) => void;
}>();
