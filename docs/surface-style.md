# Surface styles

Floe owns optional shared surface material. `standard` preserves existing presentation and is the default. `soft-neumorphic` adds shallow static depth to selected controls and shells while keeping content flat. Color palettes, density, layout, interaction ownership, and component identity remain independent. Unsupported stored values fall back to the configured default. Disable decoration, not input or navigation, in high contrast.

## Configuration and ownership

```tsx
import { FloeApp } from '@floegence/floe-webapp-core/app';

<FloeApp config={{
  theme: { defaultSurfaceStyle: 'soft-neumorphic' },
}} />;
```

`FloeSurfaceStyle = 'standard' | 'soft-neumorphic'` is exported from the main entry and as a type from the browser-neutral `/themes` entry. `useTheme().surfaceStyle()` reads the current style; `setSurfaceStyle(style)` changes it. ThemeContext is the single owner of `data-floe-surface-style` on the document root and removes it on disposal. Changing material does not reconstruct the Shell, Workbench, or business subtree and does not reapply palette tokens.

`theme.surfaceStyleStorageKey` defaults to `${theme.storageKey}-surface-style`. The existing persistence service owns namespacing, disabled storage, custom adapters, serialization, debouncing, and disposal. Missing/invalid persisted values use `defaultSurfaceStyle`; invalid configuration uses `standard`. Existing light/dark and shell-preset formats are unchanged.

## Surface roles

A host-owned visible boundary can use `data-floe-surface="flat|raised|inset|floating"`. A role only controls decoration in the optional material; it adds no wrapper, event listener, focus target, ARIA role, pointer shield, or portal. Use a real semantic component for behavior.

| Role | Shared mapping | Boundary |
| --- | --- | --- |
| `flat` | Content and explicit host opt-out | Removes decoration on that element; does not recursively remove independently declared input roles. |
| `raised` | Default Card without tilt; Button; compact badges and selected segments | Nested content cards flatten. Compact component parts retain shallow relief and semantic colors. |
| `inset` | Input, Textarea, NumberInput, AffixInput, DirectoryInput, ChatInput | One visible compound boundary. Inner controls do not add another material shadow. Native host controls can declare this role directly. |
| `floating` | Dialog, Dropdown, Tooltip, CommandPalette, FloatingWindow, WorkbenchWidget, zoom HUD, and canvas lock control | Opaque surface, controlled shadow, no backdrop blur. Existing content, clipping, coordinates, and portal ownership stay intact. |

Explicit Card variants (`glass`, `hover-lift`, `gradient-border`, `spotlight`, `shimmer`, `glow`) and `enableTilt` do not opt into material automatically. Their capabilities and opt-in motion remain available. Card transition properties are enumerated instead of `transition-all`; tilt/lift retain transform transitions. Do not combine an explicit rich variant with a material role. Dense file rows, trees and prose stay flat. Compact metadata, selection controls, status tracks, navigation controls and overlays follow the explicit [component coverage matrix](./surface-components.md), with relief scaled to their density.

In the optional style, neutral component borders and structural separators become quiet seams. Existing surface fills and shallow shadows carry grouping; selected Workbench headers use a local accent tint instead of a strong outline. The dock reuses its existing material-token boundary to remove the bright inset rim. Geometry, resizer hit targets, and semantic palette tokens do not change. Radio indicators use a 1px hollow border inside their unchanged border-box dimensions; all other border widths remain unchanged. `--floe-surface-edge` and `--floe-surface-divider` are overridable colors, defaulting to 18% and 12% neutral border color preblended with the background. The resulting seam is opaque: this avoids the extra native-editor blending cost of an alpha border while keeping its visible contrast low. Hosts with their own neutral separators can mark an existing boundary with `data-floe-surface-divider`; use `data-floe-surface-divider="fill"` for a filled divider. High contrast, error states, and explicit rich Card variants preserve their boundaries.

## Tokens and local palettes

Optional overrides:

| Token | Default role expression |
| --- | --- |
| `--floe-surface-shadow-raised` | Restrained 5px ambient shade with negative spread and a 1px interior light |
| `--floe-surface-shadow-inset` | A 2px inset shade and a 1px interior light |
| `--floe-surface-shadow-floating` | A 20px ambient shade with negative spread and a 1px interior light |
| `--floe-surface-shadow-interacting` | One 2px-blur shadow |
| `--floe-surface-highlight` | Light edge, separately tuned for light and dark mode |
| `--floe-surface-shade` | Dark edge based on the carrying color and black |

`floeSurfaceTokens` and `floeDesignTokens.surface` expose the exact shadow fallback expressions. Transparent light/shade colors composite naturally onto each carrying plane, including local Workbench colors, without a second set of opaque shadow colors or masked root-level overrides. Light mode uses 50% white light and 12% black shade; dark mode uses only 4% white light and 20% black shade. Optional shadow variables are intentionally unset until overridden; the metadata records their CSS fallbacks, not fake resolved values.

Use `theme.tokens` / named token presets for overrides. Source order remains config, active Shell preset, active named token preset, with each source's shared values followed by its active mode. Removing a preset or mode removes obsolete inline tokens through the existing synchronization service. The unlayered material rules replace component and utility decoration only on opted-in roles; the input-focus stylesheet continues to own focus border color.

Compact parts use shorter static interior lighting than content containers. The part markers are internal component details; hosts use the four public roles. Dark Cards use a 2% lighter carrying plane and floating overlays a 6% lighter plane. There are no exterior white halos or opaque black grooves. Card/choice/indicator/rail borders retain their box dimensions but become transparent so their own fill reaches the edge; native and compound input borders remain opaque for stable editing raster cost. Choice selection uses an 8% primary tint, and the existing primary tab underline is subdued. Semantic tag, progress and primary action colors stay owned by their existing palette. Switch translate/scale and progress width transitions remain functional; no SVG filters are added.

Checkbox and Switch wells use a one-pixel inner shade and an unblurred one-pixel light edge. Radio indicators instead use a hollow 1px outline, no default shadow, and a transparent unselected interior. Selection adds a 6% primary tint and the solid dot; do not apply container relief to a 6–10px mark. The outline uses an 88% muted-foreground/card blend and retains at least 3:1 contrast across the non-HC palette matrix. External dimensions, label hit targets and keyboard ownership remain unchanged. Switch thumbs and filled progress portions stay shadow-free by default; their fixed recessed tracks carry depth. Repainting even one-pixel shadows on frequently moving or resizing faces adds measurable dense-update cost. The Switch thumb keeps its existing background fill in both states; only its position and track color change. This avoids repainting the moving face in dark mode, while the palette matrix verifies at least 3:1 thumb-to-track contrast. Explicit public shadow overrides remain authoritative. Disabled Checkbox and Switch content is dimmed once by its label, not again by its face. Review these controls at both 1× and 2× pixel density, not only in enlarged previews.

Selection fills on Radio, Checkbox, Tabs and SegmentedControl are immediate. Radio dots settle through a 90ms scale transition; Checkbox marks have a 100ms micro entrance; Switch thumbs use 140ms eased translate motion that reverses from the current position. Material's generic color transition rule excludes motion owners: floating presence, switch thumbs, radio dots and progress fills. Their transition property, duration and easing remain one declaration. Never let a generic surface rule drop a functional transform or remap a transition shorthand.

FloatingWindow keeps layout/style containment on its geometry root and paint containment on the existing moving panel. The panel still clips content and owns the local portal, but its exterior shadow is no longer clipped by its parent. Dialog backdrops use static dimming (16% black in light mode, 36% in dark mode) with opacity motion and no full-page blur. The shared presence lifecycle lets the exiting style paint before starting its duration, then waits for the final frame before unmounting. Reopening reverses from the current painted state and cancels pending exit work; reduced motion skips the extra frame delay. This bounded lifecycle also applies in standard mode. Keyboard Tabs move roving focus within the key event so rapid repeated navigation uses the latest tab; the existing deferred content selection transaction remains authoritative.

## Focus, accessibility, and interaction

- Input focus changes only existing border color. Soft neumorphic fields use 88% muted-foreground blended with the opaque card color for a quiet, uniform focus boundary; custom `--floe-input-focus-color` overrides remain authoritative. The built-in non-HC palette matrix verifies at least 3:1 contrast against both the carrying card and the recessed field. Different colors per edge require a more expensive native-editor border raster path, so keep all four edges uniform. Error and high-contrast fields retain their semantic colors. Dimensions, position, padding, border width, and decorative shadow are identical before and after focus, including intermediate animation frames. Compound fields use `data-floe-input-surface`; editable descendants stay frameless.
- Select declares its existing trigger as an input boundary through `Dropdown.triggerInputSurface`; this also repairs its prior ring-based keyboard focus to follow the shared field contract in standard mode. Generic Dropdown actions remain independent buttons.
- Independent buttons and focusable surfaces compose their keyboard indicator with material. Compound input buttons keep the shared local fill. In forced colors, independent material controls use a system-color outline; input focus still uses its existing system-color border.
- High Contrast Light and forced colors suppress decoration while retaining flat opaque floating surfaces. They do not restore old blur. Reduced motion cancels material transitions.
- Drag/resize reads existing local signals through `data-floe-surface-interacting="true"`. Only the affected shell changes to the fixed lightweight shadow, with no shadow or geometry transition. Pointermove never writes theme or persisted material state.
- FloatingWindow uses the existing shared pointer session. Pointerup, pointercancel, lost capture, buttons released, blur, hidden document, close, and unmount release ownership. Its historical commit-on-pointercancel behavior is preserved. Workbench retains its existing preview/commit and pointer lifecycle.
- The private `--floe-surface-decoration` property is registered with `inherits: false`; shell decoration changes must not propagate through content descendants. Material creates no animation loop, timer, mouse light tracking, or persistent global listener. No layer promotion is added. Existing independently selected effects remain independent.
- Embedded activation remains `requestActivate({ focus: false })`; wheel ownership, native text selection/copy, stable widget identity, canvas projection, and local floating hosts remain authoritative. Never inject material into third-party iframes, terminal internals, or Monaco internals.

## Demo and acceptance

The real Demo header and Settings expose the same material switch in Activity, Deck, and Workbench. Design Tokens presents the public role/token contract. Open `?surface=soft-neumorphic&view=showcase&mode=dark` to select the new material explicitly. The switch changes existing components in place; use the same window positions and content for comparison.

The shared `SurfaceComponentGallery` is rendered by the real Demo and copied unchanged into both packed consumers. It covers compact control states and semantic variants in light/dark. The packed acceptance fixture also uses public FloeProvider, Shell, form, ChatInput, FloatingWindow, Dialog, Dropdown, and both canvas-scaled and projected Workbench widgets. Its test-only workload supplies 600 flat list rows, streaming prose, terminal-like output, trusted pointer/keyboard actions, and local menus. This is upstream shared-layer evidence, not Redeven terminal/editor performance validation.

Prepare a baseline before production changes, from the dedicated worktree:

```bash
pnpm install --frozen-lockfile
pnpm --filter @floegence/floe-webapp-core build
mkdir -p .cache/surface-style
pnpm --dir packages/core pack --pack-destination ../../.cache/surface-style
# Preserve the resulting core tarball as baseline-core.tgz.
git rev-parse HEAD > .cache/surface-style/baseline-sha.txt
node scripts/prepare-surface-consumer.mjs baseline .cache/surface-style/baseline-core.tgz
```

After implementation:

```bash
make check
pnpm test:input-focus
pnpm test:surface-style
pnpm test:surface-performance
```

`make check` owns full unit/build/dist/packed-consumer validation. The surface browser check independently consumes the actual packed component code through `/styles` and `/tailwind`; it does not alias source files. It verifies default computed styles, focus geometry with animations enabled, lifecycle, local overlays, high contrast, reduced motion, and responsive viewports. It requires the saved baseline tarball/fixture for compatibility evidence.

`check-surface-motion-browser.mjs`, included in `test:surface-style`, captures trusted input through actual intermediate animation frames: all Switch sizes in both directions, Radio dots, first-frame selection fills, rapid keyboard navigation/reversals and reduced motion. Overlay checks require both `transitionrun` and `transitionend` for opacity and transform on open and close, rather than accepting a correct endpoint after a truncated transition. It also captures 1×/2× small controls and floating-window separation in light/dark through both packed CSS entries. These functional samples are distinct from the trace-based performance budget.

The browser tools use full Chromium (`channel: 'chromium'`) and record GPU/compositor information. `--renderer=shell --output=performance-software` explicitly selects the separate Headless Shell software lane. Preserve its results and label them separately; a different renderer never retrospectively passes an earlier failed run. Dense-control scrolling, progress updates and trusted Switch/Radio/Tab toggling join the eight window/content workloads. The dense workload anchors to the actual visible control grid, not a fixed document offset. Use `--mode=dark` with a separate `--output` directory to measure the independently tuned dark material, and `--scenario` to investigate a single workload.

The performance command compares A (baseline standard), B (current standard), and C (current soft neumorphic), using the same fixture and machine, with an unrecorded warmup in each measured page, restoration of the initial workload state, and five interleaved runs per scene. Paint and raster intervals are unioned per thread before normalization, so nested trace events are not counted twice. Hot-interaction frame-loss median increment is limited to one percentage point. A paint/raster median increase above 10% in at least four of five paired runs blocks completion for investigation. Input-to-next-frame latency and long tasks are reported separately. These are task budgets, not browser guarantees or a substitute for downstream real workloads. Keep every result, including failures; investigate with the raw trace rather than selecting favorable runs.

Artifacts live under `.cache/surface-style`: baseline/current tarballs, packed preview builds, screenshots, JSON reports, and compressed Chrome traces. Decompress a trace and load its JSON in Chromium DevTools Performance. Tests do not publish packages or modify `main`.

## Downstream consumption and stop point

After user acceptance and explicit merge/release authorization, release Floe through its normal workflow. Redeven can then upgrade to that published version, opt into the style using theme configuration, mark business surfaces where needed, and remove duplicated generic shadow, blur, hover-depth, and input-focus overrides. Retain product-owned layout and semantic colors. Do not use sibling aliases, `file:`, `link:`, or a copied implementation as formal consumption. Perform real Redeven terminal, editor, Flower, and Workbench validation as a separate downstream change.

For the current acceptance task, keep the feature branch/worktree and runnable previews. Do not merge local or remote `main`, push a release tag, or publish an npm version before the user accepts and explicitly authorizes those steps.
