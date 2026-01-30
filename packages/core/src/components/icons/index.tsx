import type { JSX } from 'solid-js';

export interface IconProps extends JSX.SvgSVGAttributes<SVGSVGElement> {
  size?: number | string;
}

// Search icon
export const Search = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

// Files icon
export const Files = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <path d="M20 7h-3a2 2 0 0 1-2-2V2" />
    <path d="M9 18a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h7l4 4v10a2 2 0 0 1-2 2Z" />
    <path d="M3 7.6v12.8A1.6 1.6 0 0 0 4.6 22h9.8" />
  </svg>
);

// Settings icon
export const Settings = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

// Terminal icon
export const Terminal = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <polyline points="4 17 10 11 4 5" />
    <line x1="12" x2="20" y1="19" y2="19" />
  </svg>
);

// Sun icon
export const Sun = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2" />
    <path d="M12 20v2" />
    <path d="m4.93 4.93 1.41 1.41" />
    <path d="m17.66 17.66 1.41 1.41" />
    <path d="M2 12h2" />
    <path d="M20 12h2" />
    <path d="m6.34 17.66-1.41 1.41" />
    <path d="m19.07 4.93-1.41 1.41" />
  </svg>
);

// Moon icon
export const Moon = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
  </svg>
);

// X (close) icon
export const X = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);

// Check icon
export const Check = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

// ChevronDown icon
export const ChevronDown = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
);

// Loader2 (spinner) icon
export const Loader2 = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

// GitBranch icon
export const GitBranch = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <line x1="6" x2="6" y1="3" y2="15" />
    <circle cx="18" cy="6" r="3" />
    <circle cx="6" cy="18" r="3" />
    <path d="M18 9a9 9 0 0 1-9 9" />
  </svg>
);

// Bell icon
export const Bell = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </svg>
);

// Grid icon (for dashboard)
export const Grid = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <rect width="7" height="7" x="3" y="3" rx="1" />
    <rect width="7" height="7" x="14" y="3" rx="1" />
    <rect width="7" height="7" x="14" y="14" rx="1" />
    <rect width="7" height="7" x="3" y="14" rx="1" />
  </svg>
);

// Plus icon
export const Plus = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <path d="M5 12h14" />
    <path d="M12 5v14" />
  </svg>
);

// Trash icon
export const Trash = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <path d="M3 6h18" />
    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
  </svg>
);

// Edit/Pencil icon
export const Pencil = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    <path d="m15 5 4 4" />
  </svg>
);

// GripVertical icon (for drag handle)
export const GripVertical = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <circle cx="9" cy="12" r="1" />
    <circle cx="9" cy="5" r="1" />
    <circle cx="9" cy="19" r="1" />
    <circle cx="15" cy="12" r="1" />
    <circle cx="15" cy="5" r="1" />
    <circle cx="15" cy="19" r="1" />
  </svg>
);

// Copy icon (for duplicate)
export const Copy = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
  </svg>
);

// LayoutDashboard icon
export const LayoutDashboard = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <rect width="7" height="9" x="3" y="3" rx="1" />
    <rect width="7" height="5" x="14" y="3" rx="1" />
    <rect width="7" height="9" x="14" y="12" rx="1" />
    <rect width="7" height="5" x="3" y="16" rx="1" />
  </svg>
);

// ChevronRight icon
export const ChevronRight = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <path d="m9 18 6-6-6-6" />
  </svg>
);

// ArrowRightLeft icon (for switching/swapping)
export const ArrowRightLeft = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <path d="m16 3 4 4-4 4" />
    <path d="M20 7H4" />
    <path d="m8 21-4-4 4-4" />
    <path d="M4 17h16" />
  </svg>
);

// Grid3x3 icon (for launchpad, 9-grid pattern like macOS)
export const Grid3x3 = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="currentColor"
    class={props.class}
  >
    <circle cx="5" cy="5" r="2" />
    <circle cx="12" cy="5" r="2" />
    <circle cx="19" cy="5" r="2" />
    <circle cx="5" cy="12" r="2" />
    <circle cx="12" cy="12" r="2" />
    <circle cx="19" cy="12" r="2" />
    <circle cx="5" cy="19" r="2" />
    <circle cx="12" cy="19" r="2" />
    <circle cx="19" cy="19" r="2" />
  </svg>
);

// Maximize icon (square)
export const Maximize = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <rect width="14" height="14" x="5" y="5" rx="2" />
  </svg>
);

// Restore icon (overlapping squares)
export const Restore = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <rect width="10" height="10" x="4" y="10" rx="1" />
    <path d="M10 10V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-4" />
  </svg>
);

// Minus icon (for minimize)
export const Minus = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <path d="M5 12h14" />
  </svg>
);

// MessageSquare icon (for chat)
export const MessageSquare = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

// Bot icon (for AI assistant)
export const Bot = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <path d="M12 8V4H8" />
    <rect width="16" height="12" x="4" y="8" rx="2" />
    <path d="M2 14h2" />
    <path d="M20 14h2" />
    <path d="M15 13v2" />
    <path d="M9 13v2" />
  </svg>
);

// User icon
export const User = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <circle cx="12" cy="8" r="5" />
    <path d="M20 21a8 8 0 0 0-16 0" />
  </svg>
);

// Send icon
export const Send = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <path d="m22 2-7 20-4-9-9-4Z" />
    <path d="M22 2 11 13" />
  </svg>
);

// Paperclip icon (for attachments)
export const Paperclip = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
  </svg>
);

// ============================================
// Arrow Icons
// ============================================

// ArrowUp icon
export const ArrowUp = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <path d="m5 12 7-7 7 7" />
    <path d="M12 19V5" />
  </svg>
);

// ArrowDown icon
export const ArrowDown = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <path d="M12 5v14" />
    <path d="m19 12-7 7-7-7" />
  </svg>
);

// ArrowLeft icon
export const ArrowLeft = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <path d="m12 19-7-7 7-7" />
    <path d="M19 12H5" />
  </svg>
);

// ArrowRight icon
export const ArrowRight = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </svg>
);

// ChevronUp icon
export const ChevronUp = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <path d="m18 15-6-6-6 6" />
  </svg>
);

// ChevronLeft icon
export const ChevronLeft = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <path d="m15 18-6-6 6-6" />
  </svg>
);

// ChevronsUpDown icon
export const ChevronsUpDown = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <path d="m7 15 5 5 5-5" />
    <path d="m7 9 5-5 5 5" />
  </svg>
);

// ============================================
// Alert & Status Icons
// ============================================

// AlertCircle icon
export const AlertCircle = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="12" x2="12" y1="8" y2="12" />
    <line x1="12" x2="12.01" y1="16" y2="16" />
  </svg>
);

// AlertTriangle icon
export const AlertTriangle = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
  </svg>
);

// Info icon
export const Info = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4" />
    <path d="M12 8h.01" />
  </svg>
);

// CheckCircle icon
export const CheckCircle = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <circle cx="12" cy="12" r="10" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

// XCircle icon
export const XCircle = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <circle cx="12" cy="12" r="10" />
    <path d="m15 9-6 6" />
    <path d="m9 9 6 6" />
  </svg>
);

// ============================================
// UI Navigation Icons
// ============================================

// Menu icon
export const Menu = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <line x1="4" x2="20" y1="12" y2="12" />
    <line x1="4" x2="20" y1="6" y2="6" />
    <line x1="4" x2="20" y1="18" y2="18" />
  </svg>
);

// MoreHorizontal icon
export const MoreHorizontal = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <circle cx="12" cy="12" r="1" />
    <circle cx="19" cy="12" r="1" />
    <circle cx="5" cy="12" r="1" />
  </svg>
);

// MoreVertical icon
export const MoreVertical = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <circle cx="12" cy="12" r="1" />
    <circle cx="12" cy="5" r="1" />
    <circle cx="12" cy="19" r="1" />
  </svg>
);

// ExternalLink icon
export const ExternalLink = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <path d="M15 3h6v6" />
    <path d="M10 14 21 3" />
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
  </svg>
);

// Link icon
export const Link = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

// Home icon
export const Home = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
    <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
  </svg>
);

// Bookmark icon
export const Bookmark = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
  </svg>
);

// Star icon
export const Star = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

// Heart icon
export const Heart = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
  </svg>
);

// Pin icon
export const Pin = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <line x1="12" x2="12" y1="17" y2="22" />
    <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
  </svg>
);

// ============================================
// Media Icons
// ============================================

// Play icon
export const Play = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <polygon points="6 3 20 12 6 21 6 3" />
  </svg>
);

// Pause icon
export const Pause = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <rect x="14" y="4" width="4" height="16" rx="1" />
    <rect x="6" y="4" width="4" height="16" rx="1" />
  </svg>
);

// Stop icon
export const Stop = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <rect x="6" y="6" width="12" height="12" rx="2" />
  </svg>
);

// Volume icon
export const Volume = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
  </svg>
);

// VolumeOff icon
export const VolumeOff = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <line x1="22" x2="16" y1="9" y2="15" />
    <line x1="16" x2="22" y1="9" y2="15" />
  </svg>
);

// Mic icon
export const Mic = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" x2="12" y1="19" y2="22" />
  </svg>
);

// MicOff icon
export const MicOff = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <line x1="2" x2="22" y1="2" y2="22" />
    <path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2" />
    <path d="M5 10v2a7 7 0 0 0 12 5" />
    <path d="M15 9.34V5a3 3 0 0 0-5.68-1.33" />
    <path d="M9 9v3a3 3 0 0 0 5.12 2.12" />
    <line x1="12" x2="12" y1="19" y2="22" />
  </svg>
);

// Camera icon
export const Camera = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
    <circle cx="12" cy="13" r="3" />
  </svg>
);

// Image icon
export const Image = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
    <circle cx="9" cy="9" r="2" />
    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
  </svg>
);

// Video icon
export const Video = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5" />
    <rect x="2" y="6" width="14" height="12" rx="2" />
  </svg>
);

// ============================================
// Data & Storage Icons
// ============================================

// Database icon
export const Database = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M3 5v14a9 3 0 0 0 18 0V5" />
    <path d="M3 12a9 3 0 0 0 18 0" />
  </svg>
);

// Cloud icon
export const Cloud = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
  </svg>
);

// Download icon
export const Download = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" x2="12" y1="15" y2="3" />
  </svg>
);

// Upload icon
export const Upload = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" x2="12" y1="3" y2="15" />
  </svg>
);

// Save icon
export const Save = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
    <path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7" />
    <path d="M7 3v4a1 1 0 0 0 1 1h7" />
  </svg>
);

// ============================================
// Time Icons
// ============================================

// Clock icon
export const Clock = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

// Calendar icon
export const Calendar = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <path d="M8 2v4" />
    <path d="M16 2v4" />
    <rect width="18" height="18" x="3" y="4" rx="2" />
    <path d="M3 10h18" />
  </svg>
);

// Timer icon
export const Timer = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <line x1="10" x2="14" y1="2" y2="2" />
    <line x1="12" x2="15" y1="14" y2="11" />
    <circle cx="12" cy="14" r="8" />
  </svg>
);

// History icon
export const History = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
    <path d="M12 7v5l4 2" />
  </svg>
);

// ============================================
// Security Icons
// ============================================

// Lock icon
export const Lock = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

// Unlock icon
export const Unlock = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 9.9-1" />
  </svg>
);

// Shield icon
export const Shield = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
  </svg>
);

// ShieldCheck icon
export const ShieldCheck = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

// Key icon
export const Key = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4" />
    <path d="m21 2-9.6 9.6" />
    <circle cx="7.5" cy="15.5" r="5.5" />
  </svg>
);

// ============================================
// File Operation Icons
// ============================================

// FolderPlus icon
export const FolderPlus = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <path d="M12 10v6" />
    <path d="M9 13h6" />
    <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
  </svg>
);

// FilePlus icon
export const FilePlus = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
    <path d="M14 2v4a2 2 0 0 0 2 2h4" />
    <path d="M9 15h6" />
    <path d="M12 18v-6" />
  </svg>
);

// FileText icon
export const FileText = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
    <path d="M14 2v4a2 2 0 0 0 2 2h4" />
    <path d="M10 9H8" />
    <path d="M16 13H8" />
    <path d="M16 17H8" />
  </svg>
);

// FileCode icon
export const FileCode = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
    <path d="M14 2v4a2 2 0 0 0 2 2h4" />
    <path d="m10 13-2 2 2 2" />
    <path d="m14 17 2-2-2-2" />
  </svg>
);

// Folder icon
export const Folder = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
  </svg>
);

// FolderOpen icon
export const FolderOpen = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2" />
  </svg>
);

// ============================================
// Miscellaneous Icons
// ============================================

// Eye icon
export const Eye = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

// EyeOff icon
export const EyeOff = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" />
    <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
    <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" />
    <path d="m2 2 20 20" />
  </svg>
);

// Filter icon
export const Filter = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
);

// Refresh icon
export const Refresh = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
    <path d="M21 3v5h-5" />
    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
    <path d="M8 16H3v5" />
  </svg>
);

// Zap icon
export const Zap = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" />
  </svg>
);

// Sparkles icon
export const Sparkles = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
    <path d="M20 3v4" />
    <path d="M22 5h-4" />
    <path d="M4 17v2" />
    <path d="M5 18H3" />
  </svg>
);

// Wand icon
export const Wand = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <path d="M15 4V2" />
    <path d="M15 16v-2" />
    <path d="M8 9h2" />
    <path d="M20 9h2" />
    <path d="M17.8 11.8 19 13" />
    <path d="M15 9h.01" />
    <path d="M17.8 6.2 19 5" />
    <path d="m3 21 9-9" />
    <path d="M12.2 6.2 11 5" />
  </svg>
);

// Code icon
export const Code = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
  </svg>
);

// Hash icon
export const Hash = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <line x1="4" x2="20" y1="9" y2="9" />
    <line x1="4" x2="20" y1="15" y2="15" />
    <line x1="10" x2="8" y1="3" y2="21" />
    <line x1="16" x2="14" y1="3" y2="21" />
  </svg>
);

// Globe icon
export const Globe = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
    <path d="M2 12h20" />
  </svg>
);

// Mail icon
export const Mail = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <rect width="20" height="16" x="2" y="4" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
);

// Phone icon
export const Phone = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

// AtSign icon
export const AtSign = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <circle cx="12" cy="12" r="4" />
    <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8" />
  </svg>
);

// Tag icon
export const Tag = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" />
    <circle cx="7.5" cy="7.5" r=".5" fill="currentColor" />
  </svg>
);

// Layers icon
export const Layers = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
    <path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" />
    <path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" />
  </svg>
);

// Package icon
export const Package = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <path d="m7.5 4.27 9 5.15" />
    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
    <path d="m3.3 7 8.7 5 8.7-5" />
    <path d="M12 22V12" />
  </svg>
);

// Workflow icon
export const Workflow = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <rect width="8" height="8" x="3" y="3" rx="2" />
    <path d="M7 11v4a2 2 0 0 0 2 2h4" />
    <rect width="8" height="8" x="13" y="13" rx="2" />
  </svg>
);

// Cpu icon
export const Cpu = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <rect width="16" height="16" x="4" y="4" rx="2" />
    <rect width="6" height="6" x="9" y="9" rx="1" />
    <path d="M15 2v2" />
    <path d="M15 20v2" />
    <path d="M2 15h2" />
    <path d="M2 9h2" />
    <path d="M20 15h2" />
    <path d="M20 9h2" />
    <path d="M9 2v2" />
    <path d="M9 20v2" />
  </svg>
);

// Activity icon
export const Activity = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2" />
  </svg>
);

// BarChart icon
export const BarChart = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <line x1="12" x2="12" y1="20" y2="10" />
    <line x1="18" x2="18" y1="20" y2="4" />
    <line x1="6" x2="6" y1="20" y2="16" />
  </svg>
);

// PieChart icon
export const PieChart = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
    <path d="M22 12A10 10 0 0 0 12 2v10z" />
  </svg>
);

// TrendingUp icon
export const TrendingUp = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
    <polyline points="16 7 22 7 22 13" />
  </svg>
);

// TrendingDown icon
export const TrendingDown = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <polyline points="22 17 13.5 8.5 8.5 13.5 2 7" />
    <polyline points="16 17 22 17 22 11" />
  </svg>
);

// Quote icon (for blockquote)
export const Quote = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21c0 1 0 1 1 1z" />
    <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" />
  </svg>
);

// Highlighter icon
export const Highlighter = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <path d="m9 11-6 6v3h9l3-3" />
    <path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4" />
  </svg>
);

// ============================================
// Colored Status Icons (with gradients)
// ============================================

// Success colored icon
export const SuccessIcon = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    class={props.class}
  >
    <circle cx="12" cy="12" r="10" fill="var(--success)" opacity="0.2" />
    <circle cx="12" cy="12" r="10" fill="none" stroke="var(--success)" stroke-width="2" />
    <path
      d="m9 12 2 2 4-4"
      fill="none"
      stroke="var(--success)"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
);

// Error colored icon
export const ErrorIcon = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    class={props.class}
  >
    <circle cx="12" cy="12" r="10" fill="var(--error)" opacity="0.2" />
    <circle cx="12" cy="12" r="10" fill="none" stroke="var(--error)" stroke-width="2" />
    <path
      d="m15 9-6 6m0-6 6 6"
      fill="none"
      stroke="var(--error)"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
);

// Warning colored icon
export const WarningIcon = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    class={props.class}
  >
    <path
      d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"
      fill="var(--warning)"
      opacity="0.2"
    />
    <path
      d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"
      fill="none"
      stroke="var(--warning)"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path d="M12 9v4" fill="none" stroke="var(--warning)" stroke-width="2" stroke-linecap="round" />
    <circle cx="12" cy="17" r="0.5" fill="var(--warning)" stroke="var(--warning)" stroke-width="1" />
  </svg>
);

// Info colored icon
export const InfoIcon = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    class={props.class}
  >
    <circle cx="12" cy="12" r="10" fill="var(--info)" opacity="0.2" />
    <circle cx="12" cy="12" r="10" fill="none" stroke="var(--info)" stroke-width="2" />
    <path d="M12 16v-4" fill="none" stroke="var(--info)" stroke-width="2" stroke-linecap="round" />
    <circle cx="12" cy="8" r="0.5" fill="var(--info)" stroke="var(--info)" stroke-width="1" />
  </svg>
);

// Sparkle colored icon (for AI/magic features)
export const SparkleIcon = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    class={props.class}
  >
    <path
      d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"
      fill="var(--primary)"
      opacity="0.2"
    />
    <path
      d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"
      fill="none"
      stroke="var(--primary)"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path d="M20 3v4" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" />
    <path d="M22 5h-4" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" />
  </svg>
);

// Loading/Spinner colored icon
export const LoadingIcon = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    class={props.class}
  >
    <circle cx="12" cy="12" r="10" fill="none" stroke="var(--muted)" stroke-width="2" opacity="0.3" />
    <path d="M12 2a10 10 0 0 1 10 10" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" />
  </svg>
);

// Heart colored icon (red)
export const HeartIcon = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    class={props.class}
  >
    <path
      d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"
      fill="var(--error)"
      opacity="0.2"
    />
    <path
      d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"
      fill="none"
      stroke="var(--error)"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
);

// Star colored icon (gold/warning)
export const StarIcon = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    class={props.class}
  >
    <polygon
      points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
      fill="var(--warning)"
      opacity="0.2"
    />
    <polygon
      points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
      fill="none"
      stroke="var(--warning)"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
);

// Bell colored icon (orange/warning)
export const BellIcon = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    class={props.class}
  >
    <path
      d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"
      fill="var(--warning)"
      opacity="0.2"
    />
    <path
      d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"
      fill="none"
      stroke="var(--warning)"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      d="M10.3 21a1.94 1.94 0 0 0 3.4 0"
      fill="none"
      stroke="var(--warning)"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
);

// Cloud colored icon (blue/info)
export const CloudIcon = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    class={props.class}
  >
    <path
      d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"
      fill="var(--info)"
      opacity="0.2"
    />
    <path
      d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"
      fill="none"
      stroke="var(--info)"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
);

// Database colored icon (purple/primary)
export const DatabaseIcon = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    class={props.class}
  >
    <ellipse cx="12" cy="5" rx="9" ry="3" fill="var(--primary)" opacity="0.2" />
    <ellipse cx="12" cy="5" rx="9" ry="3" fill="none" stroke="var(--primary)" stroke-width="2" />
    <path d="M3 5v14a9 3 0 0 0 18 0V5" fill="none" stroke="var(--primary)" stroke-width="2" />
    <path d="M3 12a9 3 0 0 0 18 0" fill="none" stroke="var(--primary)" stroke-width="2" />
  </svg>
);

// Terminal colored icon (green/success)
export const TerminalIcon = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    class={props.class}
  >
    <rect x="2" y="4" width="20" height="16" rx="2" fill="var(--success)" opacity="0.2" />
    <rect x="2" y="4" width="20" height="16" rx="2" fill="none" stroke="var(--success)" stroke-width="2" />
    <polyline points="6 9 10 13 6 17" fill="none" stroke="var(--success)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    <line x1="14" x2="18" y1="17" y2="17" fill="none" stroke="var(--success)" stroke-width="2" stroke-linecap="round" />
  </svg>
);

// Mail colored icon (blue/info)
export const MailIcon = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    class={props.class}
  >
    <rect width="20" height="16" x="2" y="4" rx="2" fill="var(--info)" opacity="0.2" />
    <rect width="20" height="16" x="2" y="4" rx="2" fill="none" stroke="var(--info)" stroke-width="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" fill="none" stroke="var(--info)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
);

// Lock colored icon (yellow/warning)
export const LockIcon = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    class={props.class}
  >
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" fill="var(--warning)" opacity="0.2" />
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" fill="none" stroke="var(--warning)" stroke-width="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" fill="none" stroke="var(--warning)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
);

// Shield colored icon (green/success)
export const ShieldIcon = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    class={props.class}
  >
    <path
      d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"
      fill="var(--success)"
      opacity="0.2"
    />
    <path
      d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"
      fill="none"
      stroke="var(--success)"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path d="m9 12 2 2 4-4" fill="none" stroke="var(--success)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
);

// Zap colored icon (yellow/warning)
export const ZapIcon = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    class={props.class}
  >
    <path
      d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"
      fill="var(--warning)"
      opacity="0.2"
    />
    <path
      d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"
      fill="none"
      stroke="var(--warning)"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
);

// Globe colored icon (blue/info)
export const GlobeIcon = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    class={props.class}
  >
    <circle cx="12" cy="12" r="10" fill="var(--info)" opacity="0.2" />
    <circle cx="12" cy="12" r="10" fill="none" stroke="var(--info)" stroke-width="2" />
    <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" fill="none" stroke="var(--info)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M2 12h20" fill="none" stroke="var(--info)" stroke-width="2" stroke-linecap="round" />
  </svg>
);

// Clock colored icon (blue/info)
export const ClockIcon = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    class={props.class}
  >
    <circle cx="12" cy="12" r="10" fill="var(--info)" opacity="0.2" />
    <circle cx="12" cy="12" r="10" fill="none" stroke="var(--info)" stroke-width="2" />
    <polyline points="12 6 12 12 16 14" fill="none" stroke="var(--info)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
);

// Calendar colored icon (red/error)
export const CalendarIcon = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    class={props.class}
  >
    <rect width="18" height="18" x="3" y="4" rx="2" fill="var(--error)" opacity="0.2" />
    <rect width="18" height="18" x="3" y="4" rx="2" fill="none" stroke="var(--error)" stroke-width="2" />
    <path d="M8 2v4" fill="none" stroke="var(--error)" stroke-width="2" stroke-linecap="round" />
    <path d="M16 2v4" fill="none" stroke="var(--error)" stroke-width="2" stroke-linecap="round" />
    <path d="M3 10h18" fill="none" stroke="var(--error)" stroke-width="2" stroke-linecap="round" />
  </svg>
);

// Camera colored icon (purple/primary)
export const CameraIcon = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    class={props.class}
  >
    <path
      d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"
      fill="var(--primary)"
      opacity="0.2"
    />
    <path
      d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"
      fill="none"
      stroke="var(--primary)"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <circle cx="12" cy="13" r="3" fill="none" stroke="var(--primary)" stroke-width="2" />
  </svg>
);

// Mic colored icon (red/error)
export const MicIcon = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    class={props.class}
  >
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" fill="var(--error)" opacity="0.2" />
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" fill="none" stroke="var(--error)" stroke-width="2" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" fill="none" stroke="var(--error)" stroke-width="2" stroke-linecap="round" />
    <line x1="12" x2="12" y1="19" y2="22" fill="none" stroke="var(--error)" stroke-width="2" stroke-linecap="round" />
  </svg>
);

// Settings colored icon (gray/muted)
export const SettingsIcon = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    class={props.class}
  >
    <path
      d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"
      fill="var(--muted-foreground)"
      opacity="0.2"
    />
    <path
      d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"
      fill="none"
      stroke="var(--muted-foreground)"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <circle cx="12" cy="12" r="3" fill="none" stroke="var(--muted-foreground)" stroke-width="2" />
  </svg>
);

// User colored icon (blue/info)
export const UserIcon = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    class={props.class}
  >
    <circle cx="12" cy="8" r="5" fill="var(--info)" opacity="0.2" />
    <circle cx="12" cy="8" r="5" fill="none" stroke="var(--info)" stroke-width="2" />
    <path d="M20 21a8 8 0 0 0-16 0" fill="var(--info)" opacity="0.2" />
    <path d="M20 21a8 8 0 0 0-16 0" fill="none" stroke="var(--info)" stroke-width="2" stroke-linecap="round" />
  </svg>
);

// Home colored icon (primary)
export const HomeIcon = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    class={props.class}
  >
    <path
      d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
      fill="var(--primary)"
      opacity="0.2"
    />
    <path
      d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"
      fill="none"
      stroke="var(--primary)"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
      fill="none"
      stroke="var(--primary)"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
);

// Search colored icon (primary)
export const SearchIcon = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    class={props.class}
  >
    <circle cx="11" cy="11" r="8" fill="var(--primary)" opacity="0.2" />
    <circle cx="11" cy="11" r="8" fill="none" stroke="var(--primary)" stroke-width="2" />
    <path d="m21 21-4.3-4.3" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" />
  </svg>
);

// Download colored icon (green/success)
export const DownloadIcon = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    class={props.class}
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" fill="var(--success)" opacity="0.2" />
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" fill="none" stroke="var(--success)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    <polyline points="7 10 12 15 17 10" fill="none" stroke="var(--success)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    <line x1="12" x2="12" y1="15" y2="3" fill="none" stroke="var(--success)" stroke-width="2" stroke-linecap="round" />
  </svg>
);

// Upload colored icon (blue/info)
export const UploadIcon = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    class={props.class}
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" fill="var(--info)" opacity="0.2" />
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" fill="none" stroke="var(--info)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    <polyline points="17 8 12 3 7 8" fill="none" stroke="var(--info)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    <line x1="12" x2="12" y1="3" y2="15" fill="none" stroke="var(--info)" stroke-width="2" stroke-linecap="round" />
  </svg>
);

// GitBranch colored icon (orange/warning)
export const GitBranchIcon = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    class={props.class}
  >
    <line x1="6" x2="6" y1="3" y2="15" fill="none" stroke="var(--warning)" stroke-width="2" stroke-linecap="round" />
    <circle cx="18" cy="6" r="3" fill="var(--warning)" opacity="0.2" stroke="var(--warning)" stroke-width="2" />
    <circle cx="6" cy="18" r="3" fill="var(--warning)" opacity="0.2" stroke="var(--warning)" stroke-width="2" />
    <path d="M18 9a9 9 0 0 1-9 9" fill="none" stroke="var(--warning)" stroke-width="2" stroke-linecap="round" />
  </svg>
);

// Bookmark colored icon (gold/warning)
export const BookmarkIcon = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    class={props.class}
  >
    <path
      d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"
      fill="var(--warning)"
      opacity="0.2"
    />
    <path
      d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"
      fill="none"
      stroke="var(--warning)"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
);

// Play colored icon (green/success)
export const PlayIcon = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    class={props.class}
  >
    <circle cx="12" cy="12" r="10" fill="var(--success)" opacity="0.2" />
    <circle cx="12" cy="12" r="10" fill="none" stroke="var(--success)" stroke-width="2" />
    <polygon points="10 8 16 12 10 16 10 8" fill="var(--success)" />
  </svg>
);

// Pause colored icon (orange/warning)
export const PauseIcon = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    class={props.class}
  >
    <circle cx="12" cy="12" r="10" fill="var(--warning)" opacity="0.2" />
    <circle cx="12" cy="12" r="10" fill="none" stroke="var(--warning)" stroke-width="2" />
    <rect x="9" y="8" width="2" height="8" rx="0.5" fill="var(--warning)" />
    <rect x="13" y="8" width="2" height="8" rx="0.5" fill="var(--warning)" />
  </svg>
);

// Send colored icon (blue/info)
export const SendIcon = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    class={props.class}
  >
    <path
      d="m22 2-7 20-4-9-9-4Z"
      fill="var(--info)"
      opacity="0.2"
    />
    <path
      d="m22 2-7 20-4-9-9-4Z"
      fill="none"
      stroke="var(--info)"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path d="M22 2 11 13" fill="none" stroke="var(--info)" stroke-width="2" stroke-linecap="round" />
  </svg>
);

// Trash colored icon (red/error)
export const TrashIcon = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    class={props.class}
  >
    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" fill="var(--error)" opacity="0.2" />
    <path d="M3 6h18" fill="none" stroke="var(--error)" stroke-width="2" stroke-linecap="round" />
    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" fill="none" stroke="var(--error)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" fill="none" stroke="var(--error)" stroke-width="2" stroke-linecap="round" />
  </svg>
);

// Copy colored icon (blue/info)
export const CopyIcon = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    class={props.class}
  >
    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" fill="var(--info)" opacity="0.2" />
    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" fill="none" stroke="var(--info)" stroke-width="2" />
    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" fill="none" stroke="var(--info)" stroke-width="2" stroke-linecap="round" />
  </svg>
);

// Code colored icon (cyan/primary)
export const CodeIcon = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    class={props.class}
  >
    <polyline points="16 18 22 12 16 6" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    <polyline points="8 6 2 12 8 18" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
);

// Image colored icon (purple/primary)
export const ImageIcon = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    class={props.class}
  >
    <rect width="18" height="18" x="3" y="3" rx="2" ry="2" fill="var(--primary)" opacity="0.2" />
    <rect width="18" height="18" x="3" y="3" rx="2" ry="2" fill="none" stroke="var(--primary)" stroke-width="2" />
    <circle cx="9" cy="9" r="2" fill="var(--primary)" />
    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
);

// Video colored icon (red/error)
export const VideoIcon = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    class={props.class}
  >
    <rect x="2" y="6" width="14" height="12" rx="2" fill="var(--error)" opacity="0.2" />
    <rect x="2" y="6" width="14" height="12" rx="2" fill="none" stroke="var(--error)" stroke-width="2" />
    <path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5" fill="none" stroke="var(--error)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
);

// Package colored icon (purple/primary)
export const PackageIcon = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    class={props.class}
  >
    <path
      d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"
      fill="var(--primary)"
      opacity="0.2"
    />
    <path d="m7.5 4.27 9 5.15" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" />
    <path
      d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"
      fill="none"
      stroke="var(--primary)"
      stroke-width="2"
    />
    <path d="m3.3 7 8.7 5 8.7-5" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" />
    <path d="M12 22V12" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" />
  </svg>
);

// Layers colored icon (green/success)
export const LayersIcon = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    class={props.class}
  >
    <path
      d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"
      fill="var(--success)"
      opacity="0.2"
    />
    <path
      d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"
      fill="none"
      stroke="var(--success)"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" fill="none" stroke="var(--success)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    <path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" fill="none" stroke="var(--success)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
);

// Check colored icon (green/success)
export const CheckIcon = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    class={props.class}
  >
    <circle cx="12" cy="12" r="10" fill="var(--success)" opacity="0.2" />
    <circle cx="12" cy="12" r="10" fill="none" stroke="var(--success)" stroke-width="2" />
    <path d="M9 12l2 2 4-4" fill="none" stroke="var(--success)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
);

// Close/X colored icon (red/error)
export const CloseIcon = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    class={props.class}
  >
    <circle cx="12" cy="12" r="10" fill="var(--error)" opacity="0.2" />
    <circle cx="12" cy="12" r="10" fill="none" stroke="var(--error)" stroke-width="2" />
    <path d="m15 9-6 6m0-6 6 6" fill="none" stroke="var(--error)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
);

// Plus colored icon (green/success)
export const PlusIcon = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    class={props.class}
  >
    <circle cx="12" cy="12" r="10" fill="var(--success)" opacity="0.2" />
    <circle cx="12" cy="12" r="10" fill="none" stroke="var(--success)" stroke-width="2" />
    <path d="M12 8v8m-4-4h8" fill="none" stroke="var(--success)" stroke-width="2" stroke-linecap="round" />
  </svg>
);

// Minus colored icon (red/error)
export const MinusIcon = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    class={props.class}
  >
    <circle cx="12" cy="12" r="10" fill="var(--error)" opacity="0.2" />
    <circle cx="12" cy="12" r="10" fill="none" stroke="var(--error)" stroke-width="2" />
    <path d="M8 12h8" fill="none" stroke="var(--error)" stroke-width="2" stroke-linecap="round" />
  </svg>
);

// Edit/Pencil colored icon (blue/info)
export const EditIcon = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    class={props.class}
  >
    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" fill="var(--info)" opacity="0.2" />
    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" fill="none" stroke="var(--info)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    <path d="m15 5 4 4" fill="none" stroke="var(--info)" stroke-width="2" stroke-linecap="round" />
  </svg>
);

// Refresh colored icon (blue/info)
export const RefreshIcon = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    class={props.class}
  >
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" fill="none" stroke="var(--info)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M21 3v5h-5" fill="none" stroke="var(--info)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" fill="none" stroke="var(--info)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M8 16H3v5" fill="none" stroke="var(--info)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
);

// Link colored icon (blue/info)
export const LinkIcon = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    class={props.class}
  >
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" fill="none" stroke="var(--info)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" fill="none" stroke="var(--info)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
);

// Eye/View colored icon (blue/info)
export const EyeIcon = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    class={props.class}
  >
    <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" fill="var(--info)" opacity="0.2" />
    <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" fill="none" stroke="var(--info)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    <circle cx="12" cy="12" r="3" fill="none" stroke="var(--info)" stroke-width="2" />
  </svg>
);

// Filter colored icon (purple/primary)
export const FilterIcon = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    class={props.class}
  >
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" fill="var(--primary)" opacity="0.2" />
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
);

// Pin colored icon (red/error)
export const PinIcon = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    class={props.class}
  >
    <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" fill="var(--error)" opacity="0.2" />
    <line x1="12" x2="12" y1="17" y2="22" fill="none" stroke="var(--error)" stroke-width="2" stroke-linecap="round" />
    <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" fill="none" stroke="var(--error)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
);

// Tag colored icon (purple/primary)
export const TagIcon = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    class={props.class}
  >
    <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" fill="var(--primary)" opacity="0.2" />
    <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    <circle cx="7.5" cy="7.5" r="1" fill="var(--primary)" />
  </svg>
);

// Message/Chat colored icon (blue/info)
export const MessageIcon = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    class={props.class}
  >
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" fill="var(--info)" opacity="0.2" />
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" fill="none" stroke="var(--info)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
);

// Help/Question colored icon (blue/info)
export const HelpIcon = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    class={props.class}
  >
    <circle cx="12" cy="12" r="10" fill="var(--info)" opacity="0.2" />
    <circle cx="12" cy="12" r="10" fill="none" stroke="var(--info)" stroke-width="2" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" fill="none" stroke="var(--info)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    <circle cx="12" cy="17" r="0.5" fill="var(--info)" stroke="var(--info)" stroke-width="1" />
  </svg>
);

// Bug colored icon (red/error)
export const BugIcon = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    class={props.class}
  >
    <path d="M8 2l1.88 1.88M14.12 3.88 16 2M9 7.13v-1a3.003 3.003 0 1 1 6 0v1" fill="none" stroke="var(--error)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6" fill="var(--error)" opacity="0.2" />
    <path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6" fill="none" stroke="var(--error)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M12 20v-9M6.53 9C4.6 8.8 3 7.1 3 5M6 13H2M3 21c0-2.1 1.7-3.9 3.8-4M20.97 5c0 2.1-1.6 3.8-3.5 4M22 13h-4M17.2 17c2.1.1 3.8 1.9 3.8 4" fill="none" stroke="var(--error)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
);

// Rocket colored icon (purple/primary)
export const RocketIcon = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    class={props.class}
  >
    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09zM12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" fill="var(--primary)" opacity="0.2" />
    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
);

// Fire/Flame colored icon (orange/warning)
export const FireIcon = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    class={props.class}
  >
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" fill="var(--warning)" opacity="0.3" />
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" fill="none" stroke="var(--warning)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
);

// ThumbsUp colored icon (green/success)
export const ThumbsUpIcon = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    class={props.class}
  >
    <path d="M7 10v12M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z" fill="var(--success)" opacity="0.2" />
    <path d="M7 10v12M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z" fill="none" stroke="var(--success)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
);

// ThumbsDown colored icon (red/error)
export const ThumbsDownIcon = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    class={props.class}
  >
    <path d="M17 14V2M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22h0a3.13 3.13 0 0 1-3-3.88Z" fill="var(--error)" opacity="0.2" />
    <path d="M17 14V2M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22h0a3.13 3.13 0 0 1-3-3.88Z" fill="none" stroke="var(--error)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
);

// Share colored icon (blue/info)
export const ShareIcon = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    class={props.class}
  >
    <circle cx="18" cy="5" r="3" fill="var(--info)" opacity="0.2" stroke="var(--info)" stroke-width="2" />
    <circle cx="6" cy="12" r="3" fill="var(--info)" opacity="0.2" stroke="var(--info)" stroke-width="2" />
    <circle cx="18" cy="19" r="3" fill="var(--info)" opacity="0.2" stroke="var(--info)" stroke-width="2" />
    <line x1="8.59" x2="15.42" y1="13.51" y2="17.49" fill="none" stroke="var(--info)" stroke-width="2" stroke-linecap="round" />
    <line x1="15.41" x2="8.59" y1="6.51" y2="10.49" fill="none" stroke="var(--info)" stroke-width="2" stroke-linecap="round" />
  </svg>
);

// Save colored icon (green/success)
export const SaveIcon = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    class={props.class}
  >
    <path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" fill="var(--success)" opacity="0.2" />
    <path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" fill="none" stroke="var(--success)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7" fill="none" stroke="var(--success)" stroke-width="2" stroke-linecap="round" />
    <path d="M7 3v4a1 1 0 0 0 1 1h7" fill="none" stroke="var(--success)" stroke-width="2" stroke-linecap="round" />
  </svg>
);

// Wifi colored icon (green/success)
export const WifiIcon = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    class={props.class}
  >
    <path d="M5 13a10 10 0 0 1 14 0" fill="none" stroke="var(--success)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M8.5 16.5a5 5 0 0 1 7 0" fill="none" stroke="var(--success)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M2 8.82a15 15 0 0 1 20 0" fill="none" stroke="var(--success)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    <circle cx="12" cy="20" r="1" fill="var(--success)" />
  </svg>
);

// WifiOff colored icon (red/error)
export const WifiOffIcon = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    class={props.class}
  >
    <path d="M12 20h.01" fill="none" stroke="var(--error)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M8.5 16.429a5 5 0 0 1 7 0" fill="none" stroke="var(--error)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M5 12.859a10 10 0 0 1 5.17-2.69" fill="none" stroke="var(--error)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M19 12.859a10 10 0 0 0-2.007-1.523" fill="none" stroke="var(--error)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M2 8.82a15 15 0 0 1 4.177-2.643" fill="none" stroke="var(--error)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M22 8.82a15 15 0 0 0-11.288-3.764" fill="none" stroke="var(--error)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    <path d="m2 2 20 20" fill="none" stroke="var(--error)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
);

// Battery colored icon (green/success)
export const BatteryIcon = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    class={props.class}
  >
    <rect width="16" height="10" x="2" y="7" rx="2" ry="2" fill="var(--success)" opacity="0.2" />
    <rect width="16" height="10" x="2" y="7" rx="2" ry="2" fill="none" stroke="var(--success)" stroke-width="2" />
    <line x1="22" x2="22" y1="11" y2="13" fill="none" stroke="var(--success)" stroke-width="2" stroke-linecap="round" />
    <rect x="5" y="10" width="8" height="4" rx="1" fill="var(--success)" />
  </svg>
);

// MapPin/Location colored icon (red/error)
export const MapPinIcon = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    class={props.class}
  >
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" fill="var(--error)" opacity="0.2" />
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" fill="none" stroke="var(--error)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    <circle cx="12" cy="10" r="3" fill="none" stroke="var(--error)" stroke-width="2" />
  </svg>
);

// Sun colored icon (yellow/warning)
export const SunIcon = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    class={props.class}
  >
    <circle cx="12" cy="12" r="4" fill="var(--warning)" opacity="0.3" />
    <circle cx="12" cy="12" r="4" fill="none" stroke="var(--warning)" stroke-width="2" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" fill="none" stroke="var(--warning)" stroke-width="2" stroke-linecap="round" />
  </svg>
);

// Moon colored icon (purple/primary)
export const MoonIcon = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    class={props.class}
  >
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" fill="var(--primary)" opacity="0.2" />
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
);

// FolderPlus colored icon (yellow/warning)
export const FolderPlusIcon = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    class={props.class}
  >
    <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" fill="var(--warning)" opacity="0.2" />
    <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" fill="none" stroke="var(--warning)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M12 10v6M9 13h6" fill="none" stroke="var(--warning)" stroke-width="2" stroke-linecap="round" />
  </svg>
);

// FilePlus colored icon (green/success)
export const FilePlusIcon = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    class={props.class}
  >
    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" fill="var(--success)" opacity="0.2" />
    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" fill="none" stroke="var(--success)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M14 2v4a2 2 0 0 0 2 2h4" fill="none" stroke="var(--success)" stroke-width="2" stroke-linecap="round" />
    <path d="M12 12v6M9 15h6" fill="none" stroke="var(--success)" stroke-width="2" stroke-linecap="round" />
  </svg>
);

// Archive colored icon (brown - using muted-foreground)
export const ArchiveIcon = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    class={props.class}
  >
    <rect width="20" height="5" x="2" y="3" rx="1" fill="var(--warning)" opacity="0.3" />
    <rect width="20" height="5" x="2" y="3" rx="1" fill="none" stroke="var(--warning)" stroke-width="2" />
    <path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" fill="var(--warning)" opacity="0.2" />
    <path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" fill="none" stroke="var(--warning)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M10 12h4" fill="none" stroke="var(--warning)" stroke-width="2" stroke-linecap="round" />
  </svg>
);

// CreditCard colored icon (purple/primary)
export const CreditCardIcon = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    class={props.class}
  >
    <rect width="20" height="14" x="2" y="5" rx="2" fill="var(--primary)" opacity="0.2" />
    <rect width="20" height="14" x="2" y="5" rx="2" fill="none" stroke="var(--primary)" stroke-width="2" />
    <line x1="2" x2="22" y1="10" y2="10" fill="none" stroke="var(--primary)" stroke-width="2" />
  </svg>
);

// Dollar colored icon (green/success)
export const DollarIcon = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    class={props.class}
  >
    <circle cx="12" cy="12" r="10" fill="var(--success)" opacity="0.2" />
    <circle cx="12" cy="12" r="10" fill="none" stroke="var(--success)" stroke-width="2" />
    <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" fill="none" stroke="var(--success)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M12 18V6" fill="none" stroke="var(--success)" stroke-width="2" stroke-linecap="round" />
  </svg>
);

// Chart colored icon (green/success)
export const ChartIcon = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    class={props.class}
  >
    <rect x="3" y="3" width="18" height="18" rx="2" fill="var(--success)" opacity="0.2" />
    <rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="var(--success)" stroke-width="2" />
    <path d="M7 17V13M12 17V8M17 17V11" fill="none" stroke="var(--success)" stroke-width="2" stroke-linecap="round" />
  </svg>
);

// Activity/Pulse colored icon (red/error)
export const ActivityIcon = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    class={props.class}
  >
    <path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2" fill="none" stroke="var(--error)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
);

// Headphones colored icon (purple/primary)
export const HeadphonesIcon = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    class={props.class}
  >
    <path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3" fill="var(--primary)" opacity="0.2" />
    <path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
);

// Volume colored icon (blue/info)
export const VolumeIcon = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    class={props.class}
  >
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="var(--info)" opacity="0.2" />
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="none" stroke="var(--info)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" fill="none" stroke="var(--info)" stroke-width="2" stroke-linecap="round" />
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" fill="none" stroke="var(--info)" stroke-width="2" stroke-linecap="round" />
  </svg>
);

// Mute colored icon (red/error)
export const MuteIcon = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    class={props.class}
  >
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="var(--error)" opacity="0.2" />
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="none" stroke="var(--error)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    <line x1="22" x2="16" y1="9" y2="15" fill="none" stroke="var(--error)" stroke-width="2" stroke-linecap="round" />
    <line x1="16" x2="22" y1="9" y2="15" fill="none" stroke="var(--error)" stroke-width="2" stroke-linecap="round" />
  </svg>
);

// Power colored icon (red/error)
export const PowerIcon = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    class={props.class}
  >
    <path d="M12 2v10" fill="none" stroke="var(--error)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M18.4 6.6a9 9 0 1 1-12.77.04" fill="none" stroke="var(--error)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
);

// Award/Trophy colored icon (gold/warning)
export const AwardIcon = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    class={props.class}
  >
    <circle cx="12" cy="8" r="6" fill="var(--warning)" opacity="0.2" />
    <circle cx="12" cy="8" r="6" fill="none" stroke="var(--warning)" stroke-width="2" />
    <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" fill="none" stroke="var(--warning)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
);

// Gift colored icon (pink - using error with different opacity)
export const GiftIcon = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    class={props.class}
  >
    <rect x="3" y="8" width="18" height="4" rx="1" fill="var(--error)" opacity="0.3" />
    <rect x="3" y="8" width="18" height="4" rx="1" fill="none" stroke="var(--error)" stroke-width="2" />
    <path d="M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" fill="var(--error)" opacity="0.2" />
    <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" fill="none" stroke="var(--error)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5" fill="none" stroke="var(--error)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
);

// Target colored icon (red/error)
export const TargetIcon = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    class={props.class}
  >
    <circle cx="12" cy="12" r="10" fill="var(--error)" opacity="0.1" stroke="var(--error)" stroke-width="2" />
    <circle cx="12" cy="12" r="6" fill="var(--error)" opacity="0.2" stroke="var(--error)" stroke-width="2" />
    <circle cx="12" cy="12" r="2" fill="var(--error)" stroke="var(--error)" stroke-width="2" />
  </svg>
);

// Compass colored icon (blue/info)
export const CompassIcon = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    class={props.class}
  >
    <circle cx="12" cy="12" r="10" fill="var(--info)" opacity="0.2" />
    <circle cx="12" cy="12" r="10" fill="none" stroke="var(--info)" stroke-width="2" />
    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="var(--info)" opacity="0.5" stroke="var(--info)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
);

// Key colored icon (yellow/warning)
export const KeyIcon = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    class={props.class}
  >
    <circle cx="7.5" cy="15.5" r="5.5" fill="var(--warning)" opacity="0.2" stroke="var(--warning)" stroke-width="2" />
    <path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4" fill="none" stroke="var(--warning)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    <path d="m21 2-9.6 9.6" fill="none" stroke="var(--warning)" stroke-width="2" stroke-linecap="round" />
  </svg>
);

// Printer colored icon (gray/muted)
export const PrinterIcon = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    class={props.class}
  >
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" fill="var(--muted-foreground)" opacity="0.2" />
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" fill="none" stroke="var(--muted-foreground)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6" fill="none" stroke="var(--muted-foreground)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    <rect width="12" height="8" x="6" y="14" rx="1" fill="none" stroke="var(--muted-foreground)" stroke-width="2" />
  </svg>
);

// Bot/AI colored icon (purple/primary)
export const BotIcon = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    class={props.class}
  >
    <rect width="16" height="12" x="4" y="8" rx="2" fill="var(--primary)" opacity="0.2" />
    <rect width="16" height="12" x="4" y="8" rx="2" fill="none" stroke="var(--primary)" stroke-width="2" />
    <path d="M12 8V4H8" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M2 14h2M20 14h2" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" />
    <circle cx="9" cy="13" r="1" fill="var(--primary)" />
    <circle cx="15" cy="13" r="1" fill="var(--primary)" />
    <path d="M9 17h6" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" />
  </svg>
);

// Sparkle/Magic colored icon (gold/warning)
export const MagicIcon = (props: IconProps = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    class={props.class}
  >
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" fill="var(--warning)" opacity="0.3" />
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" fill="none" stroke="var(--warning)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M5 3v4M3 5h4M19 17v4M17 19h4" fill="none" stroke="var(--warning)" stroke-width="2" stroke-linecap="round" />
  </svg>
);
