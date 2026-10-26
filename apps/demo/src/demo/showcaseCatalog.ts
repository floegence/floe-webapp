/**
 * The showcase's navigation model.
 *
 * One list drives three surfaces: the sidebar (grouped pages), the catalog
 * grid on the index page, and the page title above every demo. Keeping it in
 * one place is what stops the three from drifting apart as components land.
 */
export interface ShowcaseEntry {
  id: string;
  label: string;
  description: string;
}

export interface ShowcaseGroup {
  label: string;
  items: ShowcaseEntry[];
}

/**
 * The three pages that orient a visitor. They are navigation, not components,
 * so the sidebar keeps them out of the catalog count and lists.
 */
export const START_PAGES: ShowcaseEntry[] = [
  {
    id: 'home',
    label: 'Home',
    description: 'What floe-webapp is, what ships in the box, and how to start.',
  },
  {
    id: 'scenarios',
    label: 'Scenarios',
    description: 'Composed product surfaces built only from the library.',
  },
  {
    id: 'overview',
    label: 'Components',
    description: 'The full catalog of core components, grouped by job.',
  },
];

export const COMPONENT_GROUPS: ShowcaseGroup[] = [
  {
    label: 'Foundation',
    items: [
      {
        id: 'surface-system',
        label: 'Surfaces',
        description: 'Elevation, state layers and the surface language in one board.',
      },
      { id: 'icons', label: 'Icons', description: 'The shared icon families and their sizing.' },
      {
        id: 'loading-overlay',
        label: 'Loading',
        description: 'Skeletons, loaders and overlay states for waiting.',
      },
    ],
  },
  {
    label: 'Actions',
    items: [
      {
        id: 'ui-buttons',
        label: 'Buttons',
        description: 'Variants, sizes, disabled and loading states.',
      },
      { id: 'ui-tags', label: 'Tags', description: 'Metadata labels from semantic roles.' },
      {
        id: 'ui-menus',
        label: 'Dropdown & Select',
        description: 'Menu surfaces and value pickers.',
      },
    ],
  },
  {
    label: 'Inputs',
    items: [
      {
        id: 'ui-inputs',
        label: 'Inputs',
        description: 'Text, number and affix fields with the input focus contract.',
      },
      { id: 'ui-radio', label: 'Radio', description: 'Single-choice groups.' },
      { id: 'ui-switch', label: 'Switch', description: 'Binary settings that apply at once.' },
      { id: 'ui-checkbox', label: 'Checkbox', description: 'Multi-select and tri-state.' },
      {
        id: 'ui-segmented-control',
        label: 'Segmented Control',
        description: 'Dense view switching inside a form or toolbar.',
      },
      {
        id: 'ui-forms',
        label: 'Form',
        description: 'Field layout, validation and submission states.',
      },
    ],
  },
  {
    label: 'Navigation',
    items: [
      { id: 'ui-tabs', label: 'Tabs', description: 'Peer views within one region.' },
      {
        id: 'ui-stepper',
        label: 'Stepper & Wizard',
        description: 'Multi-step flows and their cancellation model.',
      },
      {
        id: 'ui-pagination',
        label: 'Pagination',
        description: 'Paged results with range and size controls.',
      },
      {
        id: 'ui-command-palette',
        label: 'Command Palette',
        description: 'Keyboard-first command discovery.',
      },
      {
        id: 'ui-mobile-keyboard',
        label: 'Mobile Keyboard',
        description: 'Terminal touch input owned by the app.',
      },
    ],
  },
  {
    label: 'Feedback',
    items: [
      {
        id: 'ui-progress',
        label: 'Progress',
        description: 'Determinate and indeterminate progress.',
      },
      {
        id: 'ui-processing-indicator',
        label: 'Processing Indicator',
        description: 'Inline work state with a recoverable error.',
      },
      {
        id: 'ui-tooltips',
        label: 'Tooltip',
        description: 'Hover and focus hints without layout shift.',
      },
    ],
  },
  {
    label: 'Overlays',
    items: [
      {
        id: 'ui-dialogs',
        label: 'Dialogs',
        description: 'Blocking decisions, drawers and async confirms.',
      },
      {
        id: 'ui-floating-window',
        label: 'Floating Window',
        description: 'Draggable, resizable app windows.',
      },
    ],
  },
  {
    label: 'Pickers',
    items: [
      {
        id: 'ui-directory-picker',
        label: 'Directory Picker',
        description: 'Choose one directory with favourites.',
      },
      {
        id: 'ui-directory-input',
        label: 'Directory Input',
        description: 'A validated directory path field.',
      },
      {
        id: 'ui-file-open-picker',
        label: 'File Open Picker',
        description: 'Choose an existing file.',
      },
      {
        id: 'ui-file-save-picker',
        label: 'File Save Picker',
        description: 'Choose a destination and name a file.',
      },
      {
        id: 'ui-file-browser',
        label: 'File Browser',
        description: 'Tree browsing with drag and keyboard support.',
      },
    ],
  },
  {
    label: 'Content',
    items: [
      { id: 'ui-cards', label: 'Cards', description: 'Grouped surfaces for one subject.' },
      {
        id: 'ui-quote-block',
        label: 'Quote Block',
        description: 'Attributed quotations in reading flow.',
      },
      {
        id: 'ui-highlight-block',
        label: 'Highlight Block',
        description: 'Callouts for notes, warnings and results.',
      },
      { id: 'ui-charts', label: 'Charts', description: 'Line, bar and pie on one theme.' },
    ],
  },
];

/** Every component page, in catalog order. */
export const SHOWCASE_COMPONENTS: ShowcaseEntry[] = COMPONENT_GROUPS.flatMap(
  (group) => group.items
);

/** The full navigation model: orientation pages first, then the catalog. */
export const SHOWCASE_GROUPS: ShowcaseGroup[] = [
  { label: 'Start', items: START_PAGES },
  ...COMPONENT_GROUPS,
];

export const SHOWCASE_SECTIONS: ShowcaseEntry[] = SHOWCASE_GROUPS.flatMap((group) => group.items);

/** The group a component page belongs to, for secondary labels and filtering. */
export const SHOWCASE_GROUP_BY_ID = new Map(
  COMPONENT_GROUPS.flatMap((group) => group.items.map((item) => [item.id, group.label] as const))
);

export const SHOWCASE_BY_ID = new Map(SHOWCASE_SECTIONS.map((entry) => [entry.id, entry]));

export const DEFAULT_SHOWCASE_SECTION = 'home';
