import { createUniqueId, Show, splitProps, type JSX } from 'solid-js';

export interface ActivityRailIconProps extends JSX.SvgSVGAttributes<SVGSVGElement> {
  size?: number | string;
  /** Navigation selection or an open disclosure; hover never fills the glyph. */
  active?: boolean;
}

export interface ActivityRailGlyphProps extends ActivityRailIconProps {
  shape: () => JSX.Element;
  detail?: () => JSX.Element;
  outline?: () => JSX.Element;
  lines?: () => JSX.Element;
  activeLines?: () => JSX.Element;
  activeFillOpacity?: number;
  identity?: string;
}

/** Shared light-face/solid-selection recipe. Factories give each SVG layer its
 * own nodes; alpha cutouts reveal the actual surface in every shell theme. */
export function ActivityRailGlyph(props: ActivityRailGlyphProps) {
  const [local, rest] = splitProps(props, [
    'size',
    'active',
    'shape',
    'detail',
    'outline',
    'lines',
    'activeLines',
    'activeFillOpacity',
    'identity',
    'class',
    'children',
  ]);
  const maskId = 'floe-rail-cut-' + createUniqueId();
  return (
    <svg
      {...rest}
      xmlns="http://www.w3.org/2000/svg"
      width={local.size ?? 24}
      height={local.size ?? 24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      class={local.class}
      aria-hidden="true"
      data-floe-rail-icon={local.identity}
      data-floe-rail-active={local.active ? 'true' : 'false'}
    >
      <Show when={local.detail}>
        <defs>
          <mask
            id={maskId}
            maskUnits="userSpaceOnUse"
            x="0"
            y="0"
            width="24"
            height="24"
            style={{ 'mask-type': 'luminance' }}
          >
            <rect width="24" height="24" fill="white" stroke="none" />
            <g fill="black" stroke="black" color="black" stroke-width="1.5">
              {local.detail?.()}
            </g>
          </mask>
        </defs>
      </Show>
      <g data-floe-rail-part="lines">{local.lines?.()}</g>
      <Show
        when={local.active}
        fallback={
          <>
            <g data-floe-rail-part="face" fill="currentColor" fill-opacity=".13" stroke="none">
              {local.shape()}
            </g>
            <g data-floe-rail-part="outline">
              {local.outline ? local.outline() : local.shape()}
              {local.detail?.()}
            </g>
          </>
        }
      >
        <g
          data-floe-rail-part="solid"
          fill="currentColor"
          stroke="none"
          fill-opacity={local.activeFillOpacity ?? 1}
          mask={local.detail ? 'url(#' + maskId + ')' : undefined}
        >
          {local.shape()}
        </g>
        <g data-floe-rail-part="active-lines">{local.activeLines?.()}</g>
      </Show>
    </svg>
  );
}
