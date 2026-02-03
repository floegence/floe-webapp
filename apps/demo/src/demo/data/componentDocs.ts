import type { PropDefinition } from '../components/docs';

export interface ComponentDoc {
  name: string;
  description: string;
  props: PropDefinition[];
  usage: {
    whenToUse?: string[];
    bestPractices?: string[];
    avoid?: string[];
  };
  examples: {
    title: string;
    code: string;
    language?: string;
  }[];
}

// ===========================
// Button Component
// ===========================
export const buttonDoc: ComponentDoc = {
  name: 'Button',
  description: 'Primary interactive element for user actions. Supports multiple variants, sizes, and states.',
  props: [
    {
      name: 'variant',
      type: "'default' | 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive'",
      default: "'default'",
      description: 'Visual style variant of the button.',
    },
    {
      name: 'size',
      type: "'xs' | 'sm' | 'md' | 'lg' | 'icon'",
      default: "'md'",
      description: 'Size of the button. Use "icon" for square icon-only buttons.',
    },
    {
      name: 'loading',
      type: 'boolean',
      default: 'false',
      description: 'Shows a loading spinner and disables the button.',
    },
    {
      name: 'icon',
      type: 'Component<{ class?: string }>',
      description: 'Icon component to display before the button text.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      default: 'false',
      description: 'Disables the button interaction.',
    },
    {
      name: 'class',
      type: 'string',
      description: 'Additional CSS classes to apply.',
    },
  ],
  usage: {
    whenToUse: [
      'Primary actions in forms (Submit, Save)',
      'Navigation triggers and CTAs',
      'Destructive actions with confirmation',
    ],
    bestPractices: [
      'Use "primary" variant for the main action in a view',
      'Limit one primary button per section',
      'Use descriptive labels: "Save Changes" over "Save"',
    ],
    avoid: [
      'Multiple primary buttons in the same section',
      'Using buttons for navigation (use links instead)',
      'Vague labels like "Click here" or "Submit"',
    ],
  },
  examples: [
    {
      title: 'Basic Usage',
      code: `import { Button } from '@floegence/floe-webapp-core';

function Example() {
  return (
    <div class="flex gap-2">
      <Button variant="default">Default</Button>
      <Button variant="primary">Primary</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="destructive">Delete</Button>
    </div>
  );
}`,
    },
    {
      title: 'Loading State',
      code: `<Button loading>Saving...</Button>`,
    },
  ],
};

// ===========================
// Input Component
// ===========================
export const inputDoc: ComponentDoc = {
  name: 'Input',
  description: 'Text input field with support for icons, error states, and multiple sizes.',
  props: [
    {
      name: 'size',
      type: "'sm' | 'md' | 'lg'",
      default: "'md'",
      description: 'Size of the input field.',
    },
    {
      name: 'error',
      type: 'string',
      description: 'Error message to display below the input.',
    },
    {
      name: 'leftIcon',
      type: 'JSX.Element',
      description: 'Icon to display on the left side of the input.',
    },
    {
      name: 'rightIcon',
      type: 'JSX.Element',
      description: 'Icon to display on the right side of the input.',
    },
    {
      name: 'placeholder',
      type: 'string',
      description: 'Placeholder text when input is empty.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      default: 'false',
      description: 'Disables the input field.',
    },
  ],
  usage: {
    whenToUse: [
      'Collecting single-line text input from users',
      'Search fields with icon',
      'Form inputs with validation',
    ],
    bestPractices: [
      'Always include a label for accessibility',
      'Use placeholder text for examples, not labels',
      'Show error messages immediately after validation',
    ],
    avoid: [
      'Using placeholder as the only label',
      'Very long placeholder text',
      'Multiple icons on the same side',
    ],
  },
  examples: [
    {
      title: 'With Icon and Error',
      code: `import { Input, Search } from '@floegence/floe-webapp-core';

function Example() {
  return (
    <div class="space-y-2">
      <Input
        placeholder="Search..."
        leftIcon={<Search class="w-4 h-4" />}
      />
      <Input
        placeholder="Email"
        error="Invalid email address"
      />
    </div>
  );
}`,
    },
  ],
};

// ===========================
// NumberInput Component
// ===========================
export const numberInputDoc: ComponentDoc = {
  name: 'NumberInput',
  description: 'Number input with increment/decrement buttons and configurable min/max/step values.',
  props: [
    {
      name: 'value',
      type: 'number',
      required: true,
      description: 'Current numeric value.',
    },
    {
      name: 'onChange',
      type: '(value: number) => void',
      required: true,
      description: 'Callback when value changes.',
    },
    {
      name: 'min',
      type: 'number',
      description: 'Minimum allowed value.',
    },
    {
      name: 'max',
      type: 'number',
      description: 'Maximum allowed value.',
    },
    {
      name: 'step',
      type: 'number',
      default: '1',
      description: 'Step increment for buttons.',
    },
    {
      name: 'size',
      type: "'sm' | 'md' | 'lg'",
      default: "'md'",
      description: 'Size of the input field.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      default: 'false',
      description: 'Disables the input and buttons.',
    },
    {
      name: 'error',
      type: 'string',
      description: 'Error message to display below the input.',
    },
  ],
  usage: {
    whenToUse: [
      'Quantity selectors in e-commerce',
      'Numeric settings with bounded ranges',
      'Step-based value adjustments',
    ],
    bestPractices: [
      'Set appropriate min/max bounds',
      'Use meaningful step values',
      'Provide visual feedback at boundaries',
    ],
    avoid: [
      'Very large number ranges without step',
      'Using for unbounded numeric input',
      'Hiding the direct input capability',
    ],
  },
  examples: [
    {
      title: 'NumberInput with Range',
      code: `import { NumberInput } from '@floegence/floe-webapp-core';

function Example() {
  const [count, setCount] = createSignal(5);

  return (
    <NumberInput
      value={count()}
      onChange={setCount}
      min={0}
      max={10}
      step={1}
    />
  );
}`,
    },
  ],
};

// ===========================
// AffixInput Component
// ===========================
export const affixInputDoc: ComponentDoc = {
  name: 'AffixInput',
  description: 'Input with fixed or selectable prefix/suffix for URLs, currencies, units, and more.',
  props: [
    {
      name: 'prefix',
      type: 'string',
      description: 'Fixed prefix text (non-selectable).',
    },
    {
      name: 'suffix',
      type: 'string',
      description: 'Fixed suffix text (non-selectable).',
    },
    {
      name: 'prefixOptions',
      type: 'AffixOption[]',
      description: 'Selectable prefix options with value and label.',
    },
    {
      name: 'prefixValue',
      type: 'string',
      description: 'Selected prefix value when using prefixOptions.',
    },
    {
      name: 'onPrefixChange',
      type: '(value: string) => void',
      description: 'Callback when prefix selection changes.',
    },
    {
      name: 'suffixOptions',
      type: 'AffixOption[]',
      description: 'Selectable suffix options with value and label.',
    },
    {
      name: 'suffixValue',
      type: 'string',
      description: 'Selected suffix value when using suffixOptions.',
    },
    {
      name: 'onSuffixChange',
      type: '(value: string) => void',
      description: 'Callback when suffix selection changes.',
    },
    {
      name: 'size',
      type: "'sm' | 'md' | 'lg'",
      default: "'md'",
      description: 'Size of the input field.',
    },
    {
      name: 'error',
      type: 'string',
      description: 'Error message to display below the input.',
    },
  ],
  usage: {
    whenToUse: [
      'URL inputs with protocol selection',
      'Currency inputs with symbol prefix',
      'Unit inputs with selectable units',
      'Domain inputs with TLD suffix',
    ],
    bestPractices: [
      'Use fixed affixes for constant values',
      'Use selectable affixes when users need choices',
      'Keep affix options concise',
    ],
    avoid: [
      'Too many affix options (use dropdown instead)',
      'Very long prefix/suffix text',
      'Combining fixed and selectable on same side',
    ],
  },
  examples: [
    {
      title: 'URL Input with Protocol',
      code: `import { AffixInput } from '@floegence/floe-webapp-core';

function Example() {
  const [protocol, setProtocol] = createSignal('https');

  return (
    <AffixInput
      prefixOptions={[
        { value: 'https', label: 'https://' },
        { value: 'http', label: 'http://' },
      ]}
      prefixValue={protocol()}
      onPrefixChange={setProtocol}
      suffix=".com"
      placeholder="domain"
    />
  );
}`,
    },
  ],
};

// ===========================
// Tabs Component
// ===========================
export const tabsDoc: ComponentDoc = {
  name: 'Tabs',
  description: 'Tabbed navigation with scrollable overflow, add/close functionality, and multiple style variants.',
  props: [
    {
      name: 'items',
      type: 'TabItem[]',
      required: true,
      description: 'Array of tab items with id, label, and optional icon.',
    },
    {
      name: 'activeId',
      type: 'string',
      description: 'ID of the currently active tab.',
    },
    {
      name: 'onChange',
      type: '(id: string) => void',
      description: 'Callback when active tab changes.',
    },
    {
      name: 'onClose',
      type: '(id: string) => void',
      description: 'Callback when a tab close button is clicked.',
    },
    {
      name: 'onAdd',
      type: '() => void',
      description: 'Callback when the add button is clicked.',
    },
    {
      name: 'showAdd',
      type: 'boolean',
      default: 'false',
      description: 'Whether to show the add tab button.',
    },
    {
      name: 'closable',
      type: 'boolean',
      default: 'false',
      description: 'Whether tabs are closable by default.',
    },
    {
      name: 'size',
      type: "'sm' | 'md'",
      default: "'md'",
      description: 'Size variant of the tabs.',
    },
    {
      name: 'variant',
      type: "'default' | 'card' | 'underline'",
      default: "'default'",
      description: 'Visual style variant.',
    },
  ],
  usage: {
    whenToUse: [
      'Organizing related content into sections',
      'File editor with multiple open files',
      'Settings or preferences with categories',
    ],
    bestPractices: [
      'Keep tab labels concise (1-2 words)',
      'Use icons to enhance recognition',
      'Limit visible tabs to avoid overwhelming users',
    ],
    avoid: [
      'Using tabs for sequential steps (use Stepper instead)',
      'Nesting tabs within tabs',
      'More than 7-10 visible tabs',
    ],
  },
  examples: [
    {
      title: 'Basic Tabs with Variants',
      code: `import { Tabs, TabPanel } from '@floegence/floe-webapp-core';

function Example() {
  const [active, setActive] = createSignal('tab1');

  return (
    <>
      <Tabs
        items={[
          { id: 'tab1', label: 'Overview' },
          { id: 'tab2', label: 'Settings' },
          { id: 'tab3', label: 'Advanced' },
        ]}
        activeId={active()}
        onChange={setActive}
        variant="underline"
      />
      <TabPanel active={active() === 'tab1'}>
        Overview content
      </TabPanel>
    </>
  );
}`,
    },
  ],
};

// ===========================
// Card Component
// ===========================
export const cardDoc: ComponentDoc = {
  name: 'Card',
  description: 'Container component with multiple visual variants including 3D effects, gradients, and glass morphism.',
  props: [
    {
      name: 'variant',
      type: "'default' | 'hover-lift' | 'gradient-border' | 'glass' | 'spotlight' | 'shimmer' | 'glow'",
      default: "'default'",
      description: 'Visual effect variant of the card.',
    },
    {
      name: 'enableTilt',
      type: 'boolean',
      default: 'false',
      description: 'Enable 3D perspective tilt effect on hover.',
    },
    {
      name: 'gradientColors',
      type: 'string',
      description: 'Custom gradient colors for gradient-border variant.',
    },
    {
      name: 'glowColor',
      type: 'string',
      description: 'Glow color for glow variant (CSS color value).',
    },
  ],
  usage: {
    whenToUse: [
      'Grouping related content',
      'Feature highlights or product cards',
      'Dashboard widgets',
    ],
    bestPractices: [
      'Use subtle variants (default, hover-lift) for most cases',
      'Reserve flashy variants for marketing or emphasis',
      'Maintain consistent card sizes in grids',
    ],
    avoid: [
      'Multiple animated variants in the same view',
      'Cards without clear visual boundaries',
      'Very deep nesting of cards',
    ],
  },
  examples: [
    {
      title: 'Card with Header and Footer',
      code: `import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Button } from '@floegence/floe-webapp-core';

function Example() {
  return (
    <Card variant="hover-lift">
      <CardHeader>
        <CardTitle>Feature Card</CardTitle>
        <CardDescription>A brief description</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Card content goes here.</p>
      </CardContent>
      <CardFooter>
        <Button variant="primary">Learn More</Button>
      </CardFooter>
    </Card>
  );
}`,
    },
  ],
};

// ===========================
// Dialog Component
// ===========================
export const dialogDoc: ComponentDoc = {
  name: 'Dialog',
  description: 'Modal dialog with focus trapping, keyboard navigation, and customizable header/footer.',
  props: [
    {
      name: 'open',
      type: 'boolean',
      required: true,
      description: 'Whether the dialog is currently open.',
    },
    {
      name: 'onOpenChange',
      type: '(open: boolean) => void',
      required: true,
      description: 'Callback when dialog open state should change.',
    },
    {
      name: 'title',
      type: 'string',
      description: 'Dialog title displayed in the header.',
    },
    {
      name: 'description',
      type: 'string',
      description: 'Description text below the title.',
    },
    {
      name: 'children',
      type: 'JSX.Element',
      required: true,
      description: 'Dialog body content.',
    },
    {
      name: 'footer',
      type: 'JSX.Element',
      description: 'Footer content, typically action buttons.',
    },
  ],
  usage: {
    whenToUse: [
      'Confirming destructive actions',
      'Collecting focused input from users',
      'Displaying important information that requires acknowledgment',
    ],
    bestPractices: [
      'Always provide a way to close the dialog',
      'Use clear, action-oriented button labels',
      'Keep dialog content concise',
    ],
    avoid: [
      'Nested dialogs or dialogs spawning dialogs',
      'Very long content requiring heavy scrolling',
      'Using dialogs for simple confirmations (use ConfirmDialog)',
    ],
  },
  examples: [
    {
      title: 'Basic Dialog',
      code: `import { Dialog, Button } from '@floegence/floe-webapp-core';

function Example() {
  const [open, setOpen] = createSignal(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>Open Dialog</Button>
      <Dialog
        open={open()}
        onOpenChange={setOpen}
        title="Confirm Action"
        description="Are you sure you want to proceed?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={() => setOpen(false)}>Confirm</Button>
          </>
        }
      >
        <p>Dialog content here.</p>
      </Dialog>
    </>
  );
}`,
    },
  ],
};

// ===========================
// Dropdown Component
// ===========================
export const dropdownDoc: ComponentDoc = {
  name: 'Dropdown',
  description: 'Dropdown menu with keyboard navigation and support for separators and disabled items.',
  props: [
    {
      name: 'trigger',
      type: 'JSX.Element',
      required: true,
      description: 'Element that triggers the dropdown when clicked.',
    },
    {
      name: 'items',
      type: 'DropdownItem[]',
      required: true,
      description: 'Array of menu items with id, label, and optional icon.',
    },
    {
      name: 'value',
      type: 'string',
      description: 'Currently selected item ID.',
    },
    {
      name: 'onSelect',
      type: '(id: string) => void',
      required: true,
      description: 'Callback when an item is selected.',
    },
    {
      name: 'align',
      type: "'start' | 'center' | 'end'",
      default: "'start'",
      description: 'Horizontal alignment of the dropdown menu.',
    },
  ],
  usage: {
    whenToUse: [
      'Contextual menus with actions',
      'Selection from a list of options',
      'Nested navigation menus',
    ],
    bestPractices: [
      'Use icons to enhance item recognition',
      'Group related items with separators',
      'Keep menu items to a reasonable count (7 or fewer)',
    ],
    avoid: [
      'Very long menus with many items',
      'Deeply nested submenus',
      'Using dropdown for simple two-option choices',
    ],
  },
  examples: [
    {
      title: 'Dropdown with Separators',
      code: `import { Dropdown, Button } from '@floegence/floe-webapp-core';

function Example() {
  const [value, setValue] = createSignal('profile');

  return (
    <Dropdown
      value={value()}
      onSelect={setValue}
      items={[
        { id: 'profile', label: 'Profile' },
        { id: 'settings', label: 'Settings' },
        { id: 'separator', label: '', separator: true },
        { id: 'logout', label: 'Logout' },
      ]}
      trigger={<Button variant="outline">Menu</Button>}
    />
  );
}`,
    },
  ],
};

// ===========================
// Select Component
// ===========================
export const selectDoc: ComponentDoc = {
  name: 'Select',
  description: 'Simple select dropdown for single-value selection.',
  props: [
    {
      name: 'value',
      type: 'string',
      required: true,
      description: 'Currently selected value.',
    },
    {
      name: 'onChange',
      type: '(value: string) => void',
      required: true,
      description: 'Callback when selection changes.',
    },
    {
      name: 'options',
      type: '{ value: string; label: string }[]',
      required: true,
      description: 'Array of selectable options.',
    },
    {
      name: 'placeholder',
      type: 'string',
      default: "'Select...'",
      description: 'Placeholder text when no value is selected.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      default: 'false',
      description: 'Disables the select.',
    },
  ],
  usage: {
    whenToUse: [
      'Selecting a single value from a predefined list',
      'Form inputs with limited options',
      'Filter or sort controls',
    ],
    bestPractices: [
      'Use a meaningful placeholder',
      'Sort options logically (alphabetical, frequency)',
      'Consider native select for mobile',
    ],
    avoid: [
      'Using select for very few options (use radio buttons)',
      'Very long option lists without search',
    ],
  },
  examples: [
    {
      title: 'Basic Select',
      code: `import { Select } from '@floegence/floe-webapp-core';

function Example() {
  const [value, setValue] = createSignal('system');

  return (
    <Select
      value={value()}
      onChange={setValue}
      placeholder="Choose theme"
      options={[
        { value: 'system', label: 'System' },
        { value: 'light', label: 'Light' },
        { value: 'dark', label: 'Dark' },
      ]}
    />
  );
}`,
    },
  ],
};

// ===========================
// Tooltip Component
// ===========================
export const tooltipDoc: ComponentDoc = {
  name: 'Tooltip',
  description: 'Contextual information tooltip with customizable placement and delay.',
  props: [
    {
      name: 'content',
      type: 'string | JSX.Element',
      required: true,
      description: 'Content to display in the tooltip.',
    },
    {
      name: 'children',
      type: 'JSX.Element',
      required: true,
      description: 'Element that triggers the tooltip on hover/focus.',
    },
    {
      name: 'placement',
      type: "'top' | 'bottom' | 'left' | 'right'",
      default: "'top'",
      description: 'Position of the tooltip relative to the trigger.',
    },
    {
      name: 'delay',
      type: 'number',
      default: '300',
      description: 'Delay in milliseconds before showing the tooltip.',
    },
  ],
  usage: {
    whenToUse: [
      'Explaining icon-only buttons',
      'Providing additional context for UI elements',
      'Showing keyboard shortcuts',
    ],
    bestPractices: [
      'Keep tooltip content short',
      'Ensure trigger element is focusable for keyboard users',
      'Use consistent placement throughout the app',
    ],
    avoid: [
      'Critical information that users must see',
      'Interactive content inside tooltips',
      'Very long tooltip text',
    ],
  },
  examples: [
    {
      title: 'Tooltip with Different Placements',
      code: `import { Tooltip, Button } from '@floegence/floe-webapp-core';

function Example() {
  return (
    <div class="flex gap-4">
      <Tooltip content="Top tooltip" placement="top">
        <Button variant="outline">Top</Button>
      </Tooltip>
      <Tooltip content="Bottom tooltip" placement="bottom">
        <Button variant="outline">Bottom</Button>
      </Tooltip>
    </div>
  );
}`,
    },
  ],
};

// ===========================
// All Component Docs Registry
// ===========================
export const componentDocs: Record<string, ComponentDoc> = {
  button: buttonDoc,
  input: inputDoc,
  tabs: tabsDoc,
  card: cardDoc,
  dialog: dialogDoc,
  dropdown: dropdownDoc,
  select: selectDoc,
  tooltip: tooltipDoc,
};

// ===========================
// Loading Components
// ===========================
export const skeletonDoc: ComponentDoc = {
  name: 'Skeleton',
  description: 'Placeholder loading animation for content that is being fetched.',
  props: [
    {
      name: 'class',
      type: 'string',
      description: 'CSS classes to control dimensions (h-*, w-*) and appearance.',
    },
  ],
  usage: {
    whenToUse: [
      'Showing content placeholders during data fetching',
      'Reducing perceived loading time',
      'Maintaining layout stability during loads',
    ],
    bestPractices: [
      'Match skeleton dimensions to expected content size',
      'Use multiple skeletons to represent complex layouts',
      'Animate with pulse effect for visual feedback',
    ],
    avoid: [
      'Using for very short loading times (< 200ms)',
      'Mismatched dimensions that cause layout shifts',
      'Too many skeletons that overwhelm the user',
    ],
  },
  examples: [
    {
      title: 'Basic Skeleton',
      code: `import { Skeleton } from '@floegence/floe-webapp-core';

function Example() {
  return (
    <div class="space-y-2">
      <Skeleton class="h-4 w-3/4" />
      <Skeleton class="h-4 w-1/2" />
      <Skeleton class="h-20 w-full" />
    </div>
  );
}`,
    },
  ],
};

export const snakeLoaderDoc: ComponentDoc = {
  name: 'SnakeLoader',
  description: 'Animated snake-style loading spinner with multiple sizes.',
  props: [
    {
      name: 'size',
      type: "'sm' | 'md' | 'lg'",
      default: "'md'",
      description: 'Size of the loader.',
    },
    {
      name: 'class',
      type: 'string',
      description: 'Additional CSS classes.',
    },
  ],
  usage: {
    whenToUse: [
      'Indicating processing or loading states',
      'Button loading states',
      'Inline loading indicators',
    ],
    bestPractices: [
      'Use appropriate size for context (sm for buttons, lg for page loads)',
      'Combine with text to explain what is loading',
      'Position centrally in the loading area',
    ],
    avoid: [
      'Multiple loaders visible at once',
      'Using without context about what is loading',
    ],
  },
  examples: [
    {
      title: 'SnakeLoader Sizes',
      code: `import { SnakeLoader } from '@floegence/floe-webapp-core';

function Example() {
  return (
    <div class="flex items-center gap-4">
      <SnakeLoader size="sm" />
      <SnakeLoader size="md" />
      <SnakeLoader size="lg" />
    </div>
  );
}`,
    },
  ],
};

export const loadingOverlayDoc: ComponentDoc = {
  name: 'LoadingOverlay',
  description: 'Full-screen or container overlay with loading indicator and optional message.',
  props: [
    {
      name: 'visible',
      type: 'boolean',
      required: true,
      description: 'Whether the overlay is visible.',
    },
    {
      name: 'fullscreen',
      type: 'boolean',
      default: 'false',
      description: 'Whether to cover the entire viewport.',
    },
    {
      name: 'message',
      type: 'string',
      description: 'Loading message to display.',
    },
  ],
  usage: {
    whenToUse: [
      'Blocking user interaction during critical operations',
      'Page-level loading states',
      'Form submission processing',
    ],
    bestPractices: [
      'Always provide a message explaining what is happening',
      'Use sparingly - prefer inline loading states when possible',
      'Ensure the overlay is dismissible if the operation fails',
    ],
    avoid: [
      'Using for quick operations',
      'Leaving the overlay stuck without timeout',
      'Using without a loading message',
    ],
  },
  examples: [
    {
      title: 'LoadingOverlay with Message',
      code: `import { LoadingOverlay, Button } from '@floegence/floe-webapp-core';

function Example() {
  const [loading, setLoading] = createSignal(false);

  return (
    <>
      <Button onClick={() => setLoading(true)}>
        Start Loading
      </Button>
      <LoadingOverlay
        visible={loading()}
        fullscreen
        message="Processing your request..."
      />
    </>
  );
}`,
    },
  ],
};

// ===========================
// Highlight Block Components
// ===========================
export const highlightBlockDoc: ComponentDoc = {
  name: 'HighlightBlock',
  description: 'Callout/admonition components for highlighting important content with semantic variants (Info, Warning, Success, Error, Note, Tip).',
  props: [
    {
      name: 'title',
      type: 'string',
      description: 'Title of the highlight block.',
    },
    {
      name: 'children',
      type: 'JSX.Element',
      required: true,
      description: 'Content of the highlight block.',
    },
    {
      name: 'class',
      type: 'string',
      description: 'Additional CSS classes.',
    },
  ],
  usage: {
    whenToUse: [
      'Highlighting important information in documentation',
      'Warning users about potential issues',
      'Showing success confirmations',
      'Providing tips and best practices',
    ],
    bestPractices: [
      'Use the appropriate semantic variant (Info, Warning, Success, Error, Note, Tip)',
      'Keep content concise and actionable',
      'Include a clear title',
    ],
    avoid: [
      'Overusing highlight blocks - they lose impact',
      'Using wrong variants (e.g., Success for warnings)',
      'Very long content in highlight blocks',
    ],
  },
  examples: [
    {
      title: 'Highlight Block Variants',
      code: `import { InfoBlock, WarningBlock, SuccessBlock, ErrorBlock, NoteBlock, TipBlock } from '@floegence/floe-webapp-core';

function Example() {
  return (
    <div class="space-y-3">
      <InfoBlock title="Information">
        This is an informational callout.
      </InfoBlock>
      <WarningBlock title="Warning">
        Be careful with this operation.
      </WarningBlock>
      <SuccessBlock title="Success">
        Operation completed successfully!
      </SuccessBlock>
      <ErrorBlock title="Error">
        Something went wrong.
      </ErrorBlock>
      <NoteBlock title="Note">
        This is a note block.
      </NoteBlock>
      <TipBlock title="Pro Tip">
        Use keyboard shortcuts!
      </TipBlock>
    </div>
  );
}`,
    },
  ],
};

// ===========================
// Quote Block Component
// ===========================
export const quoteBlockDoc: ComponentDoc = {
  name: 'QuoteBlock',
  description: 'Blockquote component for documentation, citations, and code comments with multiple style variants.',
  props: [
    {
      name: 'variant',
      type: "'default' | 'subtle' | 'bordered' | 'code' | 'inline'",
      default: "'default'",
      description: 'Visual style variant.',
    },
    {
      name: 'author',
      type: 'string',
      description: 'Author attribution.',
    },
    {
      name: 'citation',
      type: 'string',
      description: 'Source citation.',
    },
    {
      name: 'children',
      type: 'JSX.Element',
      required: true,
      description: 'Quote content.',
    },
  ],
  usage: {
    whenToUse: [
      'Displaying quoted text or citations',
      'Highlighting important statements',
      'Code comments in documentation',
    ],
    bestPractices: [
      'Use appropriate variant for context',
      'Include attribution when quoting others',
      'Keep quotes concise',
    ],
    avoid: [
      'Using quotes for regular content',
      'Very long quoted passages',
      'Missing attribution for famous quotes',
    ],
  },
  examples: [
    {
      title: 'QuoteBlock Variants',
      code: `import { QuoteBlock } from '@floegence/floe-webapp-core';

function Example() {
  return (
    <div class="space-y-4">
      <QuoteBlock>
        Simple is better than complex.
      </QuoteBlock>
      <QuoteBlock variant="bordered" author="Donald Knuth">
        Premature optimization is the root of all evil.
      </QuoteBlock>
      <QuoteBlock variant="code">
        // TODO: Refactor this function
      </QuoteBlock>
    </div>
  );
}`,
    },
  ],
};

// ===========================
// Textarea Component
// ===========================
export const textareaDoc: ComponentDoc = {
  name: 'Textarea',
  description: 'Multi-line text input with auto-resize support.',
  props: [
    {
      name: 'placeholder',
      type: 'string',
      description: 'Placeholder text.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      default: 'false',
      description: 'Whether the textarea is disabled.',
    },
    {
      name: 'class',
      type: 'string',
      description: 'Additional CSS classes.',
    },
  ],
  usage: {
    whenToUse: [
      'Multi-line text input (comments, descriptions)',
      'Code input fields',
      'Message composition',
    ],
    bestPractices: [
      'Set appropriate initial height',
      'Consider auto-resize for better UX',
      'Add character count for limited fields',
    ],
    avoid: [
      'Using for single-line input',
      'Very small dimensions',
      'Missing labels for accessibility',
    ],
  },
  examples: [
    {
      title: 'Basic Textarea',
      code: `import { Textarea } from '@floegence/floe-webapp-core';

function Example() {
  return (
    <Textarea
      placeholder="Enter your message..."
      class="min-h-[100px]"
    />
  );
}`,
    },
  ],
};

// ===========================
// ConfirmDialog Component
// ===========================
export const confirmDialogDoc: ComponentDoc = {
  name: 'ConfirmDialog',
  description: 'Pre-built confirmation dialog with loading state support for async operations.',
  props: [
    {
      name: 'open',
      type: 'boolean',
      required: true,
      description: 'Whether the dialog is open.',
    },
    {
      name: 'onOpenChange',
      type: '(open: boolean) => void',
      required: true,
      description: 'Callback when open state changes.',
    },
    {
      name: 'title',
      type: 'string',
      required: true,
      description: 'Dialog title.',
    },
    {
      name: 'description',
      type: 'string',
      description: 'Dialog description.',
    },
    {
      name: 'confirmText',
      type: 'string',
      default: "'Confirm'",
      description: 'Confirm button text.',
    },
    {
      name: 'cancelText',
      type: 'string',
      default: "'Cancel'",
      description: 'Cancel button text.',
    },
    {
      name: 'loading',
      type: 'boolean',
      default: 'false',
      description: 'Shows loading state on confirm button.',
    },
    {
      name: 'onConfirm',
      type: '() => void | Promise<void>',
      required: true,
      description: 'Callback when confirm is clicked.',
    },
  ],
  usage: {
    whenToUse: [
      'Confirming destructive actions (delete, remove)',
      'Async operations requiring confirmation',
      'Important state changes',
    ],
    bestPractices: [
      'Use clear, specific titles and descriptions',
      'Show loading state during async operations',
      'Use destructive button variant for dangerous actions',
    ],
    avoid: [
      'Using for simple yes/no without consequences',
      'Nested confirmations',
      'Vague confirmation messages',
    ],
  },
  examples: [
    {
      title: 'ConfirmDialog with Async',
      code: `import { ConfirmDialog, Button } from '@floegence/floe-webapp-core';

function Example() {
  const [open, setOpen] = createSignal(false);
  const [loading, setLoading] = createSignal(false);

  const handleConfirm = async () => {
    setLoading(true);
    await deleteItem();
    setLoading(false);
    setOpen(false);
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>Delete</Button>
      <ConfirmDialog
        open={open()}
        onOpenChange={setOpen}
        title="Delete Item?"
        description="This action cannot be undone."
        confirmText="Delete"
        loading={loading()}
        onConfirm={handleConfirm}
      />
    </>
  );
}`,
    },
  ],
};

// ===========================
// Panel Components
// ===========================
export const panelDoc: ComponentDoc = {
  name: 'Panel',
  description: 'Container component for grouping content with consistent styling.',
  props: [
    {
      name: 'class',
      type: 'string',
      description: 'Additional CSS classes.',
    },
    {
      name: 'children',
      type: 'JSX.Element',
      required: true,
      description: 'Panel content.',
    },
  ],
  usage: {
    whenToUse: [
      'Grouping related content',
      'Creating consistent card-like containers',
      'Section wrappers in dashboards',
    ],
    bestPractices: [
      'Use with PanelContent for proper padding',
      'Apply border and rounded classes for visibility',
      'Maintain consistent spacing between panels',
    ],
    avoid: [
      'Deeply nesting panels',
      'Using without proper styling',
    ],
  },
  examples: [
    {
      title: 'Panel with Content',
      code: `import { Panel, PanelContent } from '@floegence/floe-webapp-core';

function Example() {
  return (
    <Panel class="border border-border rounded-md">
      <PanelContent>
        <h3 class="font-medium">Panel Title</h3>
        <p class="text-muted-foreground">Panel content here.</p>
      </PanelContent>
    </Panel>
  );
}`,
    },
  ],
};

export const tabPanelDoc: ComponentDoc = {
  name: 'TabPanel',
  description: 'Content container for tab content, controls visibility based on active state.',
  props: [
    {
      name: 'active',
      type: 'boolean',
      required: true,
      description: 'Whether this panel is currently active/visible.',
    },
    {
      name: 'class',
      type: 'string',
      description: 'Additional CSS classes.',
    },
    {
      name: 'children',
      type: 'JSX.Element',
      required: true,
      description: 'Tab panel content.',
    },
  ],
  usage: {
    whenToUse: [
      'Displaying content for active tab',
      'Tab-based navigation content areas',
    ],
    bestPractices: [
      'Match TabPanel with corresponding Tabs item',
      'Use consistent padding and styling',
    ],
    avoid: [
      'Using without Tabs component',
      'Multiple active TabPanels',
    ],
  },
  examples: [
    {
      title: 'TabPanel with Tabs',
      code: `import { Tabs, TabPanel } from '@floegence/floe-webapp-core';

function Example() {
  const [active, setActive] = createSignal('tab1');

  return (
    <>
      <Tabs
        items={[
          { id: 'tab1', label: 'Tab 1' },
          { id: 'tab2', label: 'Tab 2' },
        ]}
        activeId={active()}
        onChange={setActive}
      />
      <TabPanel active={active() === 'tab1'}>
        Content for Tab 1
      </TabPanel>
      <TabPanel active={active() === 'tab2'}>
        Content for Tab 2
      </TabPanel>
    </>
  );
}`,
    },
  ],
};

// ===========================
// Directory Picker Component
// ===========================
export const directoryPickerDoc: ComponentDoc = {
  name: 'DirectoryPicker',
  description: 'Modal directory selector with tree navigation, path input, breadcrumb, and folder creation.',
  props: [
    {
      name: 'open',
      type: 'boolean',
      required: true,
      description: 'Whether the picker is open.',
    },
    {
      name: 'onOpenChange',
      type: '(open: boolean) => void',
      required: true,
      description: 'Callback when open state changes.',
    },
    {
      name: 'files',
      type: 'FileItem[]',
      required: true,
      description: 'File tree data to display.',
    },
    {
      name: 'initialPath',
      type: 'string',
      description: 'Initial selected path.',
    },
    {
      name: 'onSelect',
      type: '(path: string) => void',
      required: true,
      description: 'Callback when a directory is selected.',
    },
    {
      name: 'onCreateFolder',
      type: '(parentPath: string, name: string) => Promise<void>',
      description: 'Callback to create a new folder.',
    },
  ],
  usage: {
    whenToUse: [
      'Selecting a save location',
      'Choosing a project directory',
      'File organization operations',
    ],
    bestPractices: [
      'Provide meaningful initial path',
      'Support folder creation for flexibility',
      'Show current selection clearly',
    ],
    avoid: [
      'Using for file selection (use FileSavePicker)',
      'Very deep directory structures without search',
    ],
  },
  examples: [
    {
      title: 'DirectoryPicker',
      code: `import { DirectoryPicker, Button } from '@floegence/floe-webapp-core';

function Example() {
  const [open, setOpen] = createSignal(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        Select Directory
      </Button>
      <DirectoryPicker
        open={open()}
        onOpenChange={setOpen}
        files={fileTree}
        initialPath="/src"
        onSelect={(path) => console.log('Selected:', path)}
      />
    </>
  );
}`,
    },
  ],
};

// ===========================
// File Save Picker Component
// ===========================
export const fileSavePickerDoc: ComponentDoc = {
  name: 'FileSavePicker',
  description: 'Save-as dialog with directory tree, file list panel, and filename input.',
  props: [
    {
      name: 'open',
      type: 'boolean',
      required: true,
      description: 'Whether the picker is open.',
    },
    {
      name: 'onOpenChange',
      type: '(open: boolean) => void',
      required: true,
      description: 'Callback when open state changes.',
    },
    {
      name: 'files',
      type: 'FileItem[]',
      required: true,
      description: 'File tree data to display.',
    },
    {
      name: 'initialPath',
      type: 'string',
      description: 'Initial directory path.',
    },
    {
      name: 'initialFileName',
      type: 'string',
      description: 'Initial filename.',
    },
    {
      name: 'onSave',
      type: '(dirPath: string, fileName: string) => void',
      required: true,
      description: 'Callback when save is clicked.',
    },
    {
      name: 'validateFileName',
      type: '(name: string) => string',
      description: 'Filename validation function, returns error message.',
    },
  ],
  usage: {
    whenToUse: [
      'Save as operations',
      'Export file dialogs',
      'Creating new files with location selection',
    ],
    bestPractices: [
      'Validate filename before save',
      'Show file list in current directory',
      'Support clicking existing files to use their name',
    ],
    avoid: [
      'Using for directory-only selection',
      'Skipping filename validation',
    ],
  },
  examples: [
    {
      title: 'FileSavePicker',
      code: `import { FileSavePicker, Button } from '@floegence/floe-webapp-core';

function Example() {
  const [open, setOpen] = createSignal(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>Save As...</Button>
      <FileSavePicker
        open={open()}
        onOpenChange={setOpen}
        files={fileTree}
        initialPath="/documents"
        initialFileName="report.pdf"
        onSave={(dir, name) => console.log(\`Save to \${dir}/\${name}\`)}
        validateFileName={(name) =>
          name.includes(' ') ? 'No spaces allowed' : ''
        }
      />
    </>
  );
}`,
    },
  ],
};

// ===========================
// File Browser Component
// ===========================
export const fileBrowserDoc: ComponentDoc = {
  name: 'FileBrowser',
  description: 'Professional file browser with list/grid views, directory tree, breadcrumb navigation, and multi-select.',
  props: [
    {
      name: 'files',
      type: 'FileItem[]',
      required: true,
      description: 'File tree data to display.',
    },
    {
      name: 'initialPath',
      type: 'string',
      description: 'Initial directory path.',
    },
    {
      name: 'initialViewMode',
      type: "'list' | 'grid'",
      default: "'list'",
      description: 'Initial view mode.',
    },
    {
      name: 'onNavigate',
      type: '(path: string) => void',
      description: 'Callback when navigating to a directory.',
    },
    {
      name: 'onSelect',
      type: '(items: FileItem[]) => void',
      description: 'Callback when items are selected.',
    },
    {
      name: 'onOpen',
      type: '(item: FileItem) => void',
      description: 'Callback when an item is opened.',
    },
  ],
  usage: {
    whenToUse: [
      'File management interfaces',
      'Project explorers',
      'Document management systems',
    ],
    bestPractices: [
      'Support both list and grid views',
      'Implement keyboard navigation',
      'Show file metadata (size, date)',
    ],
    avoid: [
      'Very flat file structures without folders',
      'Missing breadcrumb navigation',
    ],
  },
  examples: [
    {
      title: 'FileBrowser',
      code: `import { FileBrowser } from '@floegence/floe-webapp-core';

function Example() {
  return (
    <div class="h-[400px]">
      <FileBrowser
        files={fileTree}
        initialPath="/src"
        initialViewMode="list"
        onNavigate={(path) => console.log('Navigate:', path)}
        onSelect={(items) => console.log('Selected:', items)}
        onOpen={(item) => console.log('Open:', item.name)}
      />
    </div>
  );
}`,
    },
  ],
};

// ===========================
// Floating Window Component
// ===========================
export const floatingWindowDoc: ComponentDoc = {
  name: 'FloatingWindow',
  description: 'Draggable, resizable window with maximize/restore and close functionality.',
  props: [
    {
      name: 'open',
      type: 'boolean',
      required: true,
      description: 'Whether the window is open.',
    },
    {
      name: 'onOpenChange',
      type: '(open: boolean) => void',
      required: true,
      description: 'Callback when open state changes.',
    },
    {
      name: 'title',
      type: 'string',
      required: true,
      description: 'Window title.',
    },
    {
      name: 'defaultSize',
      type: '{ width: number; height: number }',
      description: 'Default window dimensions.',
    },
    {
      name: 'minSize',
      type: '{ width: number; height: number }',
      description: 'Minimum window dimensions.',
    },
    {
      name: 'footer',
      type: 'JSX.Element',
      description: 'Footer content with action buttons.',
    },
    {
      name: 'children',
      type: 'JSX.Element',
      required: true,
      description: 'Window content.',
    },
  ],
  usage: {
    whenToUse: [
      'Multi-window applications',
      'Tool palettes and inspectors',
      'Non-modal dialogs',
    ],
    bestPractices: [
      'Set reasonable default and minimum sizes',
      'Allow keyboard close (Escape)',
      'Remember window position/size',
    ],
    avoid: [
      'Too many floating windows at once',
      'Very small minimum sizes',
      'Using instead of modal dialogs for confirmations',
    ],
  },
  examples: [
    {
      title: 'FloatingWindow',
      code: `import { FloatingWindow, Button } from '@floegence/floe-webapp-core';

function Example() {
  const [open, setOpen] = createSignal(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>Open Window</Button>
      <FloatingWindow
        open={open()}
        onOpenChange={setOpen}
        title="Settings"
        defaultSize={{ width: 400, height: 300 }}
        minSize={{ width: 250, height: 200 }}
        footer={
          <Button onClick={() => setOpen(false)}>Close</Button>
        }
      >
        <p>Window content here.</p>
      </FloatingWindow>
    </>
  );
}`,
    },
  ],
};

// ===========================
// Processing Indicator Component
// ===========================
export const processingIndicatorDoc: ComponentDoc = {
  name: 'ProcessingIndicator',
  description: 'Premium status indicators with sophisticated animations for AI states, workflows, and background tasks.',
  props: [
    {
      name: 'variant',
      type: "'aurora' | 'neural' | 'orbit' | 'quantum' | 'pulse' | 'atom' | 'elegant' | 'card' | 'pill' | 'minimal'",
      default: "'elegant'",
      description: 'Animation style variant.',
    },
    {
      name: 'status',
      type: "'thinking' | 'analyzing' | 'processing' | 'working' | 'loading'",
      default: "'thinking'",
      description: 'Status label to display.',
    },
    {
      name: 'description',
      type: 'string',
      description: 'Additional description text.',
    },
    {
      name: 'showElapsed',
      type: 'boolean',
      default: 'false',
      description: 'Whether to show elapsed time.',
    },
  ],
  usage: {
    whenToUse: [
      'AI processing states',
      'Long-running background tasks',
      'Premium loading experiences',
    ],
    bestPractices: [
      'Choose variant that matches your app aesthetic',
      'Show elapsed time for long operations',
      'Provide descriptive status messages',
    ],
    avoid: [
      'Using for quick operations',
      'Multiple indicators at once',
      'Flashy variants for serious applications',
    ],
  },
  examples: [
    {
      title: 'ProcessingIndicator Variants',
      code: `import { ProcessingIndicator } from '@floegence/floe-webapp-core';

function Example() {
  return (
    <div class="space-y-4">
      <ProcessingIndicator variant="aurora" status="thinking" />
      <ProcessingIndicator
        variant="neural"
        status="processing"
        description="Analyzing code..."
        showElapsed
      />
      <ProcessingIndicator variant="minimal" status="loading" />
    </div>
  );
}`,
    },
  ],
};

// ===========================
// Chart Components
// ===========================
export const lineChartDoc: ComponentDoc = {
  name: 'LineChart',
  description: 'Line chart for trend visualization with optional area fill and gradient styling.',
  props: [
    {
      name: 'title',
      type: 'string',
      description: 'Chart title.',
    },
    {
      name: 'series',
      type: '{ name: string; data: number[] }[]',
      required: true,
      description: 'Data series to display.',
    },
    {
      name: 'labels',
      type: 'string[]',
      required: true,
      description: 'X-axis labels.',
    },
    {
      name: 'height',
      type: 'number',
      default: '200',
      description: 'Chart height in pixels.',
    },
    {
      name: 'showArea',
      type: 'boolean',
      default: 'false',
      description: 'Whether to show area fill.',
    },
    {
      name: 'variant',
      type: "'default' | 'gradient'",
      default: "'default'",
      description: 'Visual style variant.',
    },
  ],
  usage: {
    whenToUse: [
      'Showing trends over time',
      'Comparing multiple metrics',
      'Performance dashboards',
    ],
    bestPractices: [
      'Limit to 3-4 series for readability',
      'Use consistent colors across charts',
      'Include legend for multiple series',
    ],
    avoid: [
      'Too many data points without aggregation',
      'Mixing incompatible scales',
    ],
  },
  examples: [
    {
      title: 'LineChart',
      code: `import { LineChart } from '@floegence/floe-webapp-core';

function Example() {
  return (
    <LineChart
      title="Weekly Performance"
      series={[
        { name: 'Revenue', data: [120, 180, 150, 220, 280] },
        { name: 'Users', data: [80, 120, 140, 160, 200] },
      ]}
      labels={['Mon', 'Tue', 'Wed', 'Thu', 'Fri']}
      height={220}
      showArea
      variant="gradient"
    />
  );
}`,
    },
  ],
};

export const areaChartDoc: ComponentDoc = {
  name: 'AreaChart',
  description: 'Area chart for volume data visualization.',
  props: [
    {
      name: 'title',
      type: 'string',
      description: 'Chart title.',
    },
    {
      name: 'series',
      type: '{ name: string; data: number[] }[]',
      required: true,
      description: 'Data series to display.',
    },
    {
      name: 'labels',
      type: 'string[]',
      required: true,
      description: 'X-axis labels.',
    },
    {
      name: 'height',
      type: 'number',
      default: '200',
      description: 'Chart height in pixels.',
    },
  ],
  usage: {
    whenToUse: [
      'Volume or quantity over time',
      'Cumulative data visualization',
      'Traffic or usage patterns',
    ],
    bestPractices: [
      'Use for single series or stacked data',
      'Keep area fill semi-transparent',
    ],
    avoid: [
      'Multiple overlapping series without stacking',
    ],
  },
  examples: [
    {
      title: 'AreaChart',
      code: `import { AreaChart } from '@floegence/floe-webapp-core';

function Example() {
  return (
    <AreaChart
      title="Traffic Overview"
      series={[
        { name: 'Page Views', data: [450, 520, 480, 610, 580] },
      ]}
      labels={['Jan', 'Feb', 'Mar', 'Apr', 'May']}
      height={200}
    />
  );
}`,
    },
  ],
};

export const barChartDoc: ComponentDoc = {
  name: 'DataBarChart',
  description: 'Bar chart for categorical data comparison.',
  props: [
    {
      name: 'title',
      type: 'string',
      description: 'Chart title.',
    },
    {
      name: 'data',
      type: '{ label: string; value: number }[]',
      required: true,
      description: 'Data items to display.',
    },
    {
      name: 'height',
      type: 'number',
      default: '200',
      description: 'Chart height in pixels.',
    },
    {
      name: 'variant',
      type: "'default' | 'gradient'",
      default: "'default'",
      description: 'Visual style variant.',
    },
  ],
  usage: {
    whenToUse: [
      'Comparing categories',
      'Ranking data',
      'Distribution visualization',
    ],
    bestPractices: [
      'Sort bars by value for easy comparison',
      'Use consistent colors',
      'Limit to 10-12 categories',
    ],
    avoid: [
      'Too many categories without scrolling',
      'Misleading axis scales',
    ],
  },
  examples: [
    {
      title: 'DataBarChart',
      code: `import { DataBarChart } from '@floegence/floe-webapp-core';

function Example() {
  return (
    <DataBarChart
      title="Sales by Region"
      data={[
        { label: 'North', value: 420 },
        { label: 'South', value: 380 },
        { label: 'East', value: 510 },
        { label: 'West', value: 290 },
      ]}
      height={200}
      variant="gradient"
    />
  );
}`,
    },
  ],
};

export const pieChartDoc: ComponentDoc = {
  name: 'DataPieChart',
  description: 'Pie and donut charts for proportional data.',
  props: [
    {
      name: 'title',
      type: 'string',
      description: 'Chart title.',
    },
    {
      name: 'data',
      type: '{ label: string; value: number }[]',
      required: true,
      description: 'Data slices to display.',
    },
    {
      name: 'size',
      type: 'number',
      default: '160',
      description: 'Chart diameter in pixels.',
    },
    {
      name: 'innerRadius',
      type: 'number',
      default: '0',
      description: 'Inner radius ratio for donut chart (0-1).',
    },
  ],
  usage: {
    whenToUse: [
      'Part-to-whole relationships',
      'Market share visualization',
      'Budget breakdowns',
    ],
    bestPractices: [
      'Limit to 5-6 slices',
      'Use donut for center labels',
      'Sort by value',
    ],
    avoid: [
      'Too many small slices',
      'Comparing multiple pie charts',
    ],
  },
  examples: [
    {
      title: 'DataPieChart',
      code: `import { DataPieChart } from '@floegence/floe-webapp-core';

function Example() {
  return (
    <div class="flex gap-4">
      <DataPieChart
        title="Market Share"
        data={[
          { label: 'Product A', value: 35 },
          { label: 'Product B', value: 25 },
          { label: 'Others', value: 40 },
        ]}
        size={160}
      />
      <DataPieChart
        title="Donut Chart"
        data={[...]}
        size={160}
        innerRadius={0.6}
      />
    </div>
  );
}`,
    },
  ],
};

export const monitoringChartDoc: ComponentDoc = {
  name: 'MonitoringChart',
  description: 'Real-time monitoring chart with auto-updating data.',
  props: [
    {
      name: 'title',
      type: 'string',
      description: 'Chart title.',
    },
    {
      name: 'series',
      type: '{ name: string; data: number[] }[]',
      required: true,
      description: 'Initial data series.',
    },
    {
      name: 'labels',
      type: 'string[]',
      required: true,
      description: 'Initial X-axis labels.',
    },
    {
      name: 'height',
      type: 'number',
      default: '200',
      description: 'Chart height in pixels.',
    },
    {
      name: 'realtime',
      type: 'boolean',
      default: 'false',
      description: 'Enable real-time updates.',
    },
    {
      name: 'updateInterval',
      type: 'number',
      default: '2000',
      description: 'Update interval in milliseconds.',
    },
    {
      name: 'maxPoints',
      type: 'number',
      default: '15',
      description: 'Maximum data points to display.',
    },
    {
      name: 'onUpdate',
      type: '() => { values: number[]; label: string }',
      description: 'Callback to get new data point.',
    },
  ],
  usage: {
    whenToUse: [
      'System monitoring dashboards',
      'Live metrics visualization',
      'Real-time performance tracking',
    ],
    bestPractices: [
      'Set appropriate update intervals',
      'Limit max points for performance',
      'Include legend for multiple series',
    ],
    avoid: [
      'Very fast update intervals',
      'Too many concurrent charts',
    ],
  },
  examples: [
    {
      title: 'MonitoringChart',
      code: `import { MonitoringChart } from '@floegence/floe-webapp-core';

function Example() {
  return (
    <MonitoringChart
      title="System Metrics"
      series={[
        { name: 'CPU', data: [45, 52, 48, 61, 55] },
        { name: 'Memory', data: [72, 68, 75, 71, 69] },
      ]}
      labels={['5s', '4s', '3s', '2s', '1s']}
      height={200}
      realtime
      updateInterval={2000}
      maxPoints={10}
      onUpdate={() => ({
        values: [Math.random() * 100, Math.random() * 100],
        label: 'now',
      })}
    />
  );
}`,
    },
  ],
};

// ===========================
// Command Palette Component
// ===========================
export const commandPaletteDoc: ComponentDoc = {
  name: 'CommandPalette',
  description: 'Keyboard-driven command palette for quick actions, search, and navigation.',
  props: [
    {
      name: 'commands',
      type: 'Command[]',
      description: 'Array of available commands (typically from registry).',
    },
  ],
  usage: {
    whenToUse: [
      'Quick action access',
      'Keyboard-driven navigation',
      'Search across application features',
    ],
    bestPractices: [
      'Register commands with categories',
      'Provide keyboard shortcuts for common actions',
      'Use fuzzy search for better UX',
    ],
    avoid: [
      'Too many commands without categories',
      'Conflicting keyboard shortcuts',
    ],
  },
  examples: [
    {
      title: 'CommandPalette Setup',
      code: `import { CommandPalette, useCommand } from '@floegence/floe-webapp-core';

function App() {
  const command = useCommand();

  // Open with keyboard shortcut (Mod+K)
  // or programmatically:
  const openPalette = () => command.open();

  return (
    <>
      <Button onClick={openPalette}>
        Open Command Palette
      </Button>
      <CommandPalette />
    </>
  );
}`,
    },
  ],
};

// ===========================
// Form Components
// ===========================
export const formDoc: ComponentDoc = {
  name: 'Form',
  description: 'Composable form components for building accessible forms with validation support.',
  props: [
    {
      name: 'onSubmit',
      type: '(e: SubmitEvent) => void | Promise<void>',
      description: 'Called when form is submitted. Automatically handles async operations.',
    },
    {
      name: 'class',
      type: 'string',
      description: 'Additional CSS classes to apply.',
    },
  ],
  usage: {
    whenToUse: [
      'User input collection (login, signup, settings)',
      'Data entry forms with validation',
      'Multi-step wizards',
    ],
    bestPractices: [
      'Use FormField to wrap each input with label and error handling',
      'Group related fields with FormSection',
      'Place action buttons in FormActions with align="end"',
    ],
    avoid: [
      'Deeply nested form structures',
      'Missing labels for accessibility',
      'Forms without proper error feedback',
    ],
  },
  examples: [
    {
      title: 'Basic Form',
      code: `import { Form, FormField, FormLabel, FormMessage, FormActions, Input, Button } from '@floegence/floe-webapp-core';

function LoginForm() {
  const handleSubmit = async () => {
    await new Promise(r => setTimeout(r, 1000));
    console.log('Form submitted');
  };

  return (
    <Form onSubmit={handleSubmit}>
      <FormField>
        <FormLabel required>Email</FormLabel>
        <Input type="email" placeholder="you@example.com" />
        <FormMessage error="Please enter a valid email" />
      </FormField>

      <FormField>
        <FormLabel required>Password</FormLabel>
        <Input type="password" />
      </FormField>

      <FormActions>
        <Button type="submit">Sign In</Button>
      </FormActions>
    </Form>
  );
}`,
    },
    {
      title: 'Form with Sections',
      code: `<Form>
  <FormSection title="Personal Info" description="Basic information about you">
    <FormRow>
      <FormField>
        <FormLabel>First Name</FormLabel>
        <Input />
      </FormField>
      <FormField>
        <FormLabel>Last Name</FormLabel>
        <Input />
      </FormField>
    </FormRow>
  </FormSection>

  <FormDivider label="or" />

  <FormSection title="Contact">
    <FormField>
      <FormLabel>Email</FormLabel>
      <Input type="email" />
      <FormDescription>We'll never share your email.</FormDescription>
    </FormField>
  </FormSection>
</Form>`,
    },
  ],
};

// ===========================
// Stepper Component
// ===========================
export const stepperDoc: ComponentDoc = {
  name: 'Stepper',
  description: 'Multi-step progress indicator for wizards and workflows. Shows users where they are in a multi-step process.',
  props: [
    {
      name: 'steps',
      type: 'StepItem[]',
      description: 'Array of step definitions with id, label, and optional description.',
      required: true,
    },
    {
      name: 'currentStep',
      type: 'number | Accessor<number>',
      description: 'Current active step index (0-based).',
      required: true,
    },
    {
      name: 'onStepClick',
      type: '(stepIndex: number, step: StepItem) => void',
      description: 'Callback when a step is clicked. Use for navigation.',
    },
    {
      name: 'variant',
      type: "'default' | 'minimal' | 'dots'",
      default: "'default'",
      description: 'Visual style variant.',
    },
    {
      name: 'orientation',
      type: "'horizontal' | 'vertical'",
      default: "'horizontal'",
      description: 'Layout direction of the stepper.',
    },
    {
      name: 'size',
      type: "'sm' | 'md' | 'lg'",
      default: "'md'",
      description: 'Size of step indicators.',
    },
    {
      name: 'showConnector',
      type: 'boolean',
      default: 'true',
      description: 'Whether to show connector lines between steps.',
    },
    {
      name: 'allowClickCompleted',
      type: 'boolean',
      default: 'true',
      description: 'Allow clicking on completed steps to navigate back.',
    },
    {
      name: 'allowClickFuture',
      type: 'boolean',
      default: 'false',
      description: 'Allow clicking on future steps.',
    },
  ],
  usage: {
    whenToUse: [
      'Multi-step forms and wizards',
      'Checkout or registration flows',
      'Onboarding processes',
      'Any linear progression workflow',
    ],
    bestPractices: [
      'Keep step count between 3-5 for best UX',
      'Use clear, concise step labels',
      'Allow users to go back to completed steps',
      'Show step descriptions for complex processes',
    ],
    avoid: [
      'Using for non-linear navigation',
      'Too many steps (>7)',
      'Vague step labels',
      'Hiding current position in the process',
    ],
  },
  examples: [
    {
      title: 'Basic Horizontal Stepper',
      code: `import { Stepper, type StepItem } from '@floegence/floe-webapp-core';
import { createSignal } from 'solid-js';

const steps: StepItem[] = [
  { id: 'account', label: 'Account', description: 'Create your account' },
  { id: 'profile', label: 'Profile', description: 'Set up your profile' },
  { id: 'complete', label: 'Complete', description: 'All done!' },
];

function Example() {
  const [current, setCurrent] = createSignal(1);

  return (
    <Stepper
      steps={steps}
      currentStep={current()}
      onStepClick={(index) => setCurrent(index)}
      allowClickCompleted={true}
    />
  );
}`,
    },
    {
      title: 'Vertical Stepper',
      code: `<Stepper
  steps={steps}
  currentStep={1}
  orientation="vertical"
  size="lg"
/>`,
    },
    {
      title: 'Minimal Variant',
      code: `<Stepper
  steps={steps}
  currentStep={0}
  variant="minimal"
/>`,
    },
    {
      title: 'Dots Variant',
      code: `<Stepper
  steps={steps}
  currentStep={2}
  variant="dots"
/>`,
    },
  ],
};

// ===========================
// Wizard Component
// ===========================
export const wizardDoc: ComponentDoc = {
  name: 'Wizard',
  description: 'Complete wizard component combining Stepper with step content. Provides a full multi-step form experience.',
  props: [
    {
      name: 'steps',
      type: '(StepItem & { content: JSX.Element })[]',
      description: 'Array of steps with content to render for each step.',
      required: true,
    },
    {
      name: 'currentStep',
      type: 'number | Accessor<number>',
      description: 'Current active step index.',
      required: true,
    },
    {
      name: 'footer',
      type: 'JSX.Element',
      description: 'Footer content, typically navigation buttons.',
    },
    {
      name: 'contentClass',
      type: 'string',
      description: 'Additional class for the content area.',
    },
    {
      name: 'footerClass',
      type: 'string',
      description: 'Additional class for the footer area.',
    },
  ],
  usage: {
    whenToUse: [
      'Complete wizard flows with content',
      'Step-by-step forms with varying content',
      'Setup or configuration processes',
    ],
    bestPractices: [
      'Use with useWizard hook for state management',
      'Provide clear navigation buttons in footer',
      'Validate each step before proceeding',
    ],
    avoid: [
      'Mixing with external stepper state',
      'Complex nested wizards',
    ],
  },
  examples: [
    {
      title: 'Complete Wizard with useWizard Hook',
      code: `import { Wizard, useWizard, Button, type StepItem } from '@floegence/floe-webapp-core';

function SetupWizard() {
  const wizard = useWizard({ totalSteps: 3 });

  const steps = [
    {
      id: 'welcome',
      label: 'Welcome',
      content: <div>Welcome to the setup wizard!</div>,
    },
    {
      id: 'settings',
      label: 'Settings',
      content: <div>Configure your preferences here.</div>,
    },
    {
      id: 'finish',
      label: 'Finish',
      content: <div>Setup complete!</div>,
    },
  ];

  return (
    <Wizard
      steps={steps}
      currentStep={wizard.currentStep}
      footer={
        <div class="flex justify-between">
          <Button
            variant="outline"
            onClick={wizard.prevStep}
            disabled={wizard.isFirstStep()}
          >
            Back
          </Button>
          <Button onClick={wizard.nextStep}>
            {wizard.isLastStep() ? 'Finish' : 'Next'}
          </Button>
        </div>
      }
    />
  );
}`,
    },
  ],
};

// ===========================
// useWizard Hook
// ===========================
export const useWizardDoc: ComponentDoc = {
  name: 'useWizard',
  description: 'Hook for managing wizard state including navigation between steps.',
  props: [
    {
      name: 'totalSteps',
      type: 'number',
      description: 'Total number of steps in the wizard.',
      required: true,
    },
    {
      name: 'initialStep',
      type: 'number',
      default: '0',
      description: 'Initial step index (0-based).',
    },
    {
      name: 'onStepChange',
      type: '(step: number) => void',
      description: 'Callback when step changes.',
    },
  ],
  usage: {
    whenToUse: [
      'Managing wizard navigation state',
      'Custom wizard implementations',
      'When you need programmatic step control',
    ],
    bestPractices: [
      'Use with Stepper or Wizard components',
      'Implement validation before nextStep',
    ],
    avoid: [],
  },
  examples: [
    {
      title: 'Basic Usage',
      code: `import { useWizard } from '@floegence/floe-webapp-core';

function MyWizard() {
  const {
    currentStep,
    nextStep,
    prevStep,
    goToStep,
    isFirstStep,
    isLastStep,
    reset,
  } = useWizard({ totalSteps: 4 });

  return (
    <div>
      <p>Current Step: {currentStep()}</p>
      <button onClick={prevStep} disabled={isFirstStep()}>Back</button>
      <button onClick={nextStep} disabled={isLastStep()}>Next</button>
      <button onClick={reset}>Reset</button>
    </div>
  );
}`,
    },
  ],
};
