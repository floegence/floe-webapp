import { For } from 'solid-js';
import {
  Grid3x3,
  LayoutDashboard,
  Layers,
  ShieldCheck,
  Terminal,
  Zap,
} from '@floegence/floe-webapp-core/icons';
import { Button, Tag } from '@floegence/floe-webapp-core/ui';
import { CodeSnippet, ShowcaseFrame } from '../components/docs';
import { SHOWCASE_COMPONENTS } from '../showcaseCatalog';

export interface HomePageProps {
  onSelectSection: (id: string) => void;
  onOpenFile: (id: string) => void;
}

/* The demo's front door. It answers the three questions a first-time visitor
 * has — what this is, what it gives you, and how to start — and then hands
 * off to the component catalog and the scenario gallery. Everything on it is
 * built from the same primitives it advertises, so the page is also a demo. */

const QUICK_START = `import { FloeProvider, useTheme } from '@floegence/floe-webapp-core';
import { Shell } from '@floegence/floe-webapp-core/layout';

export function App() {
  return (
    <FloeProvider config={{ storage: { namespace: 'my-app' } }}>
      <Shell logo={<Logo />} activityItems={items}>
        <Workspace />
      </Shell>
    </FloeProvider>
  );
}`;

const MODES = [
  {
    id: 'activity',
    label: 'Activity',
    icon: Terminal,
    summary:
      'The familiar workbench: a rail, contributed sidebars, commands, search and focused pages.',
    detail: 'Default mode',
  },
  {
    id: 'deck',
    label: 'Deck',
    icon: LayoutDashboard,
    summary:
      'Resizable grid layouts for tools that belong beside each other, with shared drag and resize.',
    detail: 'Dashboard mode',
  },
  {
    id: 'workbench',
    label: 'Workbench',
    icon: Grid3x3,
    summary:
      'A persistent canvas where product-owned widgets float, stack and keep their own focus and input.',
    detail: 'Canvas mode',
  },
] as const;

const CAPABILITIES = [
  {
    title: 'Interaction contracts',
    body: 'Wheel, text selection, focus, input borders and async layout stability are specified once and enforced by browser gates — not re-decided per component.',
    section: 'ui-buttons',
    icon: Zap,
  },
  {
    title: 'Design language',
    body: 'One control scale, named radii, semantic state layers and light/dark shell themes, all exposed as tokens you can read and override.',
    section: 'surface-system',
    icon: Layers,
  },
  {
    title: 'Typed protocol wiring',
    body: 'A typed RPC contract and protocol provider connect the shell to your backend without leaking transport details into components.',
    section: 'ui-forms',
    icon: ShieldCheck,
  },
  {
    title: 'Extension points',
    body: 'Register components, sidebar views, status-bar items, commands and launchpad entries; the shell composes them without knowing your business.',
    section: 'overview',
    icon: Grid3x3,
  },
] as const;

const SHIPPED = [
  { label: 'Shell & navigation', detail: 'Activity bar, sidebar, top bar, status bar' },
  { label: 'Workbench canvas', detail: 'Widgets, stacking, projection, embedded input' },
  { label: 'Deck grid', detail: 'Drag, resize, presets, persistence' },
  { label: 'Chat & markdown', detail: 'Streaming blocks, media, workers, code highlight' },
  { label: 'File tooling', detail: 'Browser, pickers, Monaco integration, PDF' },
  { label: 'Data display', detail: 'Charts, tables, progress, status regions' },
  { label: 'Overlays', detail: 'Dialogs, drawers, floating windows, command palette' },
  { label: 'Terminal', detail: 'Session model, suggestions, mobile keyboard' },
] as const;

export function HomePage(props: HomePageProps) {
  const componentCount = () => SHOWCASE_COMPONENTS.length;

  return (
    <ShowcaseFrame class="space-y-10">
      {/* Hero */}
      <section class="space-y-4 border-b border-[var(--floe-line)] pb-6">
        <div class="flex flex-wrap items-center gap-2">
          <Tag variant="primary" tone="soft" size="sm">
            Solid.js workspace framework
          </Tag>
          <Tag tone="soft" size="sm">
            TypeScript
          </Tag>
          <Tag tone="soft" size="sm">
            Tailwind v4
          </Tag>
        </div>

        <div class="max-w-2xl space-y-2">
          <h1 class="text-2xl font-semibold tracking-[var(--floe-tracking-tight)]">Floe Webapp</h1>
          <p class="text-[length:var(--floe-type-body)] leading-[var(--floe-line-body)] text-[var(--floe-ink-soft)]">
            A composable application framework for products that need more than a page and a
            sidebar. It supplies the shell, the interaction contracts and the workspace surfaces;
            your product keeps its routes, business state and voice.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <Button variant="primary" onClick={() => props.onSelectSection('overview')}>
            Browse {componentCount()} components
          </Button>
          <Button variant="outline" onClick={() => props.onSelectSection('scenarios')}>
            See composed scenarios
          </Button>
          <Button variant="ghost" onClick={() => props.onOpenFile('docs.getting-started')}>
            Read getting started
          </Button>
        </div>
      </section>

      {/* Three ways to work */}
      <section class="space-y-3">
        <div class="space-y-1">
          <h2 class="text-[length:var(--floe-type-body)] font-semibold">
            One shell, three ways to work
          </h2>
          <p class="text-caption text-[var(--floe-ink-soft)]">
            The same components, theme and contracts, arranged for a file-centric tool, a dashboard
            or a canvas. Switching modes never changes your data model.
          </p>
        </div>

        <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
          <For each={MODES}>
            {(mode) => (
              <div
                data-floe-surface="raised"
                class="flex flex-col gap-2 rounded-card border border-[var(--floe-line)] p-[var(--floe-pad-card)]"
              >
                <div class="flex items-center gap-2">
                  <span class="flex h-7 w-7 items-center justify-center rounded-control bg-[var(--floe-well)] text-[var(--floe-ink-soft)]">
                    <mode.icon class="h-4 w-4" />
                  </span>
                  <div class="min-w-0">
                    <div class="text-[length:var(--floe-type-control)] font-medium">
                      {mode.label}
                    </div>
                    <div class="text-caption text-[var(--floe-ink-quiet)]">{mode.detail}</div>
                  </div>
                </div>
                <p class="text-caption leading-snug text-[var(--floe-ink-soft)]">{mode.summary}</p>
              </div>
            )}
          </For>
        </div>
      </section>

      {/* Capabilities */}
      <section class="space-y-3">
        <div class="space-y-1">
          <h2 class="text-[length:var(--floe-type-body)] font-semibold">What the framework owns</h2>
          <p class="text-caption text-[var(--floe-ink-soft)]">
            Problems that are expensive to get right twice, solved once and covered by browser
            gates.
          </p>
        </div>

        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <For each={CAPABILITIES}>
            {(item) => (
              <button
                type="button"
                data-floe-interactive="lift"
                data-floe-surface="raised"
                class="flex flex-col items-start gap-1.5 rounded-card border border-[var(--floe-line)] p-[var(--floe-pad-card)] text-left cursor-pointer transition-colors duration-[var(--floe-duration-fast)] ease-[var(--floe-ease-out)] hover:border-[var(--floe-line-strong)]"
                // This card is a layout container, not an action label: its
                // body copy wraps. `:where(button)` sets nowrap from an
                // unlayered sheet, which outranks every utility layer, so the
                // override has to be inline.
                style={{ 'white-space': 'normal' }}
                onClick={() => props.onSelectSection(item.section)}
              >
                <span class="flex items-center gap-2 text-[length:var(--floe-type-control)] font-medium">
                  <item.icon class="h-4 w-4 text-[var(--floe-ink-soft)]" />
                  {item.title}
                </span>
                <span class="text-caption leading-snug text-[var(--floe-ink-soft)]">
                  {item.body}
                </span>
              </button>
            )}
          </For>
        </div>
      </section>

      {/* Quick start */}
      <section class="space-y-3">
        <div class="space-y-1">
          <h2 class="text-[length:var(--floe-type-body)] font-semibold">Quick start</h2>
          <p class="text-caption text-[var(--floe-ink-soft)]">
            Install the core package, wrap your tree in a provider, and the shell takes over the
            chrome.
          </p>
        </div>
        <CodeSnippet title="App.tsx" language="tsx" code={QUICK_START} maxHeight="360px" />
      </section>

      {/* What ships */}
      <section class="space-y-3">
        <div class="space-y-1">
          <h2 class="text-[length:var(--floe-type-body)] font-semibold">What ships in the box</h2>
          <p class="text-caption text-[var(--floe-ink-soft)]">
            Each area has its own page in the catalog with live demos, guidance, source and props.
          </p>
        </div>
        <div class="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
          <For each={SHIPPED}>
            {(item) => (
              <div class="flex items-baseline justify-between gap-3 border-b border-[var(--floe-line-quiet)] py-1.5">
                <span class="text-[length:var(--floe-type-control)]">{item.label}</span>
                <span class="text-right text-caption text-[var(--floe-ink-quiet)]">
                  {item.detail}
                </span>
              </div>
            )}
          </For>
        </div>
      </section>
    </ShowcaseFrame>
  );
}
