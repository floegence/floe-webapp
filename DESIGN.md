# Design System Specification: Floe Webapp

## 1. Overview & Creative North Star

**Creative North Star: "The Quiet Workbench"**

Floe Webapp is not a dashboard skin. It is a composable application shell for serious web software, borrowing the spatial discipline of an editor while remaining lighter, calmer, and more product-agnostic than a direct VSCode clone.

The visual system should feel like a workbench:

- **Quiet chrome:** navigation, status, search, and shell structure stay visually disciplined so the product's actual work surface can lead.
- **Precise contrast:** light mode reads like warm paper and blue-black ink; dark mode reads like cool ink and high-clarity type.
- **Adaptive density:** the system must support file trees, editors, chat, metrics, settings, and mobile navigation without changing personality.
- **Measured richness:** gradients, glass, shimmer, and spotlight treatments are allowed, but only as intentional emphasis on premium or transitional surfaces, never as the baseline language of the shell.

This is a framework design system, not a single-screen brand campaign. The shell must make many kinds of products look coherent.

---

## 2. Colors & Surface Philosophy

The palette is built around two complementary atmospheres:

- **Light Theme:** warm paper `--background` (`hsl(36 15% 93%)`) with deep blue-black ink `--foreground` (`hsl(215 40% 13%)`).
- **Dark Theme:** blue-black ink `--background` (`hsl(222 30% 8%)`) with near-white text `--foreground` (`hsl(210 20% 98%)`).

Semantic color is mandatory. Shared components must consume exported tokens rather than ad hoc Tailwind colors or hard-coded hex values.

### The Token Rule

**Explicit Instruction:** Shared UI must be colored through Floe tokens first.

1. Use semantic variables such as `--background`, `--card`, `--border`, `--sidebar`, `--activity-bar`, `--success`, `--warning`, `--error`, and `--info`.
2. If a component needs a new visual role, add a token before adding a one-off color.
3. Status colors should remain semantic and perceptually balanced; Floe uses OKLCH for success, warning, error, and info states.

### The Seam Rule

Unlike "no-line" systems, Floe allows 1px seams, but only when they carry structure.

1. Borders are valid for shell chrome, cards, panels, inputs, tables, and segmented content.
2. Borders must come from semantic tokens such as `--border`, `--chrome-border`, `--sidebar-border`, or `--terminal-panel-border`.
3. Do not use decorative dividers where spacing, background change, or typography already establishes hierarchy.

### Surface Hierarchy

Treat the application as a stack of functional surfaces rather than a pile of cards.

- **Canvas:** `--background` for the main shell, top bar, and bottom status region.
- **Navigation Rails:** `--activity-bar` for the compact left rail, `--sidebar` for tree/navigation panes.
- **Content Modules:** `--card` and `--popover` for panels, dialogs, menus, and assistant bubbles.
- **Embedded Contrast:** `--muted` and `--accent` for hover fills, search triggers, inactive buttons, and secondary states.
- **Terminal Plane:** `--terminal-background` and `--terminal-foreground` for code-adjacent environments that need a distinct operational feel.

### The Richness Budget

Glass, blur, glow, and gradient treatments are not banned, but they are opt-in.

- Use `backdrop-blur` and translucent card surfaces for launchpads, floating overlays, and premium card variants.
- Build rich gradients from token mixes around `--primary`, `--accent`, and `--info`, not from unrelated brand colors.
- Keep the baseline shell flat, crisp, and structural. Richness belongs to moments of focus, not every panel.

---

## 3. Typography

Floe typography is intentionally restrained. Authority comes from rhythm and contrast, not from decorative display faces.

- **UI & Content (`Inter`):** the default voice for shell chrome, forms, panels, and general content.
- **Code & Diagnostics (`JetBrains Mono`):** the dedicated voice for code blocks, terminals, shortcuts, timestamps, and compact status metadata.

### Key Scales

- **Text XS:** `11px` for captions, helper text, dense metadata, and compact shell labels.
- **Text SM:** `12px` for secondary content and most control labels.
- **Text Base:** `14px` for default body copy.
- **Text LG:** `16px` for stronger panel titles and emphasized body content.
- **Text XL:** `18px` for section titles.
- **Text 2XL:** `20px` for page titles.

### Typographic Guidance

- Default to sentence case; reserve all-caps for narrow metadata only.
- Keep shell copy compact and literal. The frame should explain function, not advertise itself.
- Use mono sparingly and purposefully. It should signal precision, not become the global tone of the UI.
- In micro-chrome such as the bottom bar and keybind chips, smaller mono text is acceptable when contrast remains strong.

### Spacing Rhythm

The system favors compact precision over oversized SaaS padding.

- **2px to 8px:** icon gaps, badges, inline metadata.
- **12px to 16px:** standard control padding, panel interiors, shell gutters.
- **24px to 32px:** page-level separation and grouped content sections.

---

## 4. Elevation, Depth & Motion

Floe does not rely on heavy material-style depth. It prefers crisp seams, stepped surfaces, and fast feedback.

### Depth Strategy

- **Primary depth:** achieved through surface stepping (`background` -> `sidebar` -> `card`) and restrained borders.
- **Standard elevation:** `shadow-sm` is acceptable on buttons and default cards.
- **Floating elevation:** `shadow-lg` or diffused shadows are reserved for dialogs, floating windows, launchpad tiles, and richer cards.
- **Premium elevation:** glass, glow, shimmer, and gradient borders are supported, but should read as optional enhancement rather than framework default.

### The UI-First Motion Rule

Motion in Floe is functional. The interface should look responsive before heavier logic runs.

1. Visual state changes happen first.
2. Non-essential work is deferred off the interaction hot path.
3. Motion should reinforce clarity, not create drag or latency.

### The Hot Surface Rule

Any draggable or resizable geometry surface must remain immediate under pointer interaction.

1. Do not animate `width`, `height`, `left`, `top`, or other geometry properties on hot interaction surfaces.
2. During resize/drag, transitions and animations must be disabled on shell sidebars, sidebar panes, floating windows, and similar geometry-bound surfaces.
3. Prefer color, opacity, and light transform feedback for controls. Avoid `transition-all` on interaction-heavy UI.

### Approved Motion Language

- Fast color and opacity transitions for buttons, tabs, and hoverable chrome.
- `animate-in`, `fade-in`, `zoom-in-95`, and `slide-in-from-top-2` for menus and dialogs.
- Gradient shift, shimmer, glow pulse, and richer animated indicators only where the component is explicitly a premium surface.

---

## 5. Components

### Shell Chrome

The shell is the product's frame and must remain stable across apps.

- **Top Bar:** `40px` tall, quiet, token-based, with a muted command/search trigger and compact action area.
- **Activity Bar:** a narrow left rail (`40px` on small screens, `48px` on medium+) with icon-first navigation and a left-edge active indicator.
- **Sidebar:** a dedicated structural plane using `--sidebar`, not just another card.
- **Bottom Bar:** a minimal mono status strip for low-noise operational context.
- **Mobile Tab Bar / Drawer:** on mobile, the shell should preserve the same IA with reduced chrome, not invent a separate aesthetic.

### Panels & Cards

Floe uses panels for most working surfaces.

- Standard panels use `bg-card`, `text-card-foreground`, and tokenized borders.
- Panel headers are compact and factual; default spacing is `px-3 py-2`.
- Panel content defaults to `p-3`.
- Standard cards may use a border and restrained shadow. Rich variants such as `glass`, `spotlight`, `gradient-border`, `shimmer`, and `glow` are available for emphasis, demos, launchpads, or moments of delight.

### Buttons

- **Primary / Default:** `bg-primary`, `text-primary-foreground`; this is the strongest action.
- **Secondary:** `bg-secondary`, `text-secondary-foreground`; use for supporting actions.
- **Outline:** structure through border and background contrast, not through saturation.
- **Ghost:** minimal chrome for inline actions and shell controls.
- **Destructive:** always consume `--error` / `--error-foreground`, never hand-picked reds.

Buttons should stay compact, slightly rounded, and fast. The personality is precise rather than pillowy.

### Inputs

Inputs should feel embedded in the same surface system as the shell.

- Use `bg-background` with `border-input`.
- Focus is expressed through `ring` and border shift, not exaggerated glow.
- Helper and error text sit at `11px` and must be semantically connected.
- Inputs may include left/right icons, but those icons are subordinate to the text field, not decorative anchors.

### Chat Surfaces

Chat is a first-class work surface, not a novelty module.

- User messages use a primary-driven gradient bubble.
- Assistant messages render on `card` surfaces with internal separators for mixed block content.
- Avatars, metadata, tool output, and error states should preserve the same semantic token system as the rest of the framework.
- Code, logs, and diffs must clearly shift into mono-oriented sub-surfaces without breaking the surrounding theme.

### Launchpad & Premium Overlays

Floe allows a more cinematic mode for immersive selection and transitional UI.

- Launchpad may use full-screen blur, radial lighting, richer gradients, larger radii, and elevated icon tiles.
- This language is intentionally more expressive than the shell, but it must still derive from Floe tokens and feel related to the main system.
- Premium processing indicators are appropriate here, or on focused loading/analysis states, but not for every tiny async action.

### Status & Feedback

- Connected/success states use `--success`.
- Warnings use `--warning`.
- Errors use `--error`.
- Informational states use `--info`.
- Activity, connection, and sync feedback should be legible from a distance and consistent across bottom bar, badges, alerts, and processing indicators.

---

## 6. Do's and Don'ts

### Do

- **Do** use semantic tokens everywhere in shared UI.
- **Do** preserve the warm-paper light theme and blue-black dark theme as the system's primary duality.
- **Do** keep shell chrome compact and disciplined so product content can dominate.
- **Do** use borders as structural seams, not decoration.
- **Do** separate preview/live interaction state from committed application state for resize and drag flows.
- **Do** prefer fast, low-cost motion and UI-first state updates.
- **Do** verify contrast, focus visibility, keyboard behavior, and responsive shell behavior in both light and dark themes.
- **Do** reserve premium effects for premium surfaces.

### Don't

- **Don't** hard-code Tailwind palette colors into audited shared components.
- **Don't** use `transition-all` or layout-chasing motion on hot geometry surfaces.
- **Don't** flood the baseline shell with gradients, neon glows, or glass effects.
- **Don't** treat every surface like a standalone card if it is really part of the shell frame.
- **Don't** rebuild overlay semantics, focus handling, or keyboard navigation ad hoc when shared primitives already own them.
- **Don't** use pure black or pure white when the exported tokens already provide contrast-safe values.
- **Don't** let visual richness outrun product clarity.
