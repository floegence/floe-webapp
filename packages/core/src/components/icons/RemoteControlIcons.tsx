import type { IconProps } from './index';

// Distinct silhouettes for display, input, clipboard and connection controls.
export const Monitor = (props: IconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 24} height={props.size ?? 24}
    viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"
    stroke-linecap="round" stroke-linejoin="round" class={props.class}>
    <rect x="3" y="4" width="18" height="13" rx="2" /><path d="M8 21h8m-4-4v4" />
  </svg>
);

export const Keyboard = (props: IconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 24} height={props.size ?? 24}
    viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"
    stroke-linecap="round" stroke-linejoin="round" class={props.class}>
    <rect x="2" y="5" width="20" height="14" rx="2" /><path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M7 15h10" />
  </svg>
);

export const Clipboard = (props: IconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 24} height={props.size ?? 24}
    viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"
    stroke-linecap="round" stroke-linejoin="round" class={props.class}>
    <path d="M9 5H6a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-3" /><rect x="9" y="2" width="6" height="5" rx="1" /><path d="M8 12h8m-8 4h5" />
  </svg>
);

export const Unplug = (props: IconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 24} height={props.size ?? 24}
    viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"
    stroke-linecap="round" stroke-linejoin="round" class={props.class}>
    <path d="m3 21 4-4m10-10 4-4M6 12l6 6m-5-5 3-3m1 7 3-3m-7-3-2 2a3 3 0 0 0 0 4l2 2a3 3 0 0 0 4 0l2-2m4-6 2-2a3 3 0 0 0 0-4l-2-2a3 3 0 0 0-4 0l-2 2m0 0 6 6" />
  </svg>
);

export const Fullscreen = (props: IconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 24} height={props.size ?? 24}
    viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"
    stroke-linecap="round" stroke-linejoin="round" class={props.class}>
    <path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5" />
  </svg>
);

export const ExitFullscreen = (props: IconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 24} height={props.size ?? 24}
    viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"
    stroke-linecap="round" stroke-linejoin="round" class={props.class}>
    <path d="M3 8h5V3m8 0v5h5M8 21v-5H3m18 0h-5v5" />
  </svg>
);

export const SlidersHorizontal = (props: IconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 24} height={props.size ?? 24}
    viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"
    stroke-linecap="round" stroke-linejoin="round" class={props.class}>
    <path d="M3 6h4m4 0h10M3 12h10m4 0h4M3 18h4m4 0h10" /><path d="M7 3v6m10 0v6M7 15v6" />
  </svg>
);

export const Scan = (props: IconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 24} height={props.size ?? 24}
    viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"
    stroke-linecap="round" stroke-linejoin="round" class={props.class}>
    <path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5" /><rect x="7" y="8" width="10" height="8" rx="1" />
  </svg>
);

export const ActualSize = (props: IconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 24} height={props.size ?? 24}
    viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"
    stroke-linecap="round" stroke-linejoin="round" class={props.class}>
    <rect x="3" y="3" width="18" height="18" rx="2" /><path d="m6.5 10 1.5-1v6m8-5 1.5-1v6M12 10h.01M12 14h.01" />
  </svg>
);

