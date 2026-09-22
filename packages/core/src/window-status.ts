// Browser-neutral artwork for first-party host-window status documents.
import { refreshIconPaths } from './components/icons/refreshPaths';

export const windowStatusRefreshSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${refreshIconPaths.map((d) => `<path d="${d}"/>`).join('')}</svg>`;

const artwork = {
  access:
    '<path class="quiet" d="M72 29H51v52h21m96-52h21v52h-21M73 55h19m56 0h19"/><path class="soft" d="m120 16 27 10v29c0 24-27 36-27 36s-27-12-27-36V26z"/><rect x="109" y="47" width="22" height="21" rx="3"/><path d="M113 47v-7a7 7 0 0 1 14 0v7m-7 8v5"/><circle class="quiet" cx="51" cy="55" r="3"/><circle class="quiet" cx="189" cy="55" r="3"/>',
  editor:
    '<rect x="56" y="21" width="128" height="76" rx="6"/><path class="soft" d="M56 38h128M77 38v59"/><circle cx="65" cy="29" r="1" fill="currentColor"/><circle cx="71" cy="29" r="1" fill="currentColor"/><circle cx="77" cy="29" r="1" fill="currentColor"/><path class="quiet" d="M64 48h5m-5 8h5m-5 8h5m-5 8h5M43 47H31v25h12m154-25h12v25h-12"/><path d="m111 55-9 11 9 11m38-22 9 11-9 11m-15-27-9 31"/>',
  service:
    '<rect x="26" y="33" width="48" height="39" rx="5"/><path class="soft" d="M26 44h48"/><circle cx="33" cy="39" r="1" fill="currentColor"/><circle cx="39" cy="39" r="1" fill="currentColor"/><rect x="171" y="25" width="43" height="23" rx="4"/><rect x="171" y="60" width="43" height="23" rx="4"/><path class="soft" d="M179 35h12m-12 35h12"/><circle cx="205" cy="36" r="1.5"/><circle cx="205" cy="71" r="1.5"/><path class="quiet" d="M82 54h20m36 0h22m0 0v-18h11m-11 18v18h11"/><circle cx="120" cy="54" r="13" class="soft"/><path d="M120 47v8m0 5v.1"/>',
} as const;

/** Returns fixed, trusted SVG markup. Host copy and user input never enter SVG. */
export function windowStatusIllustrationSvg(kind: keyof typeof artwork): string {
  return `<svg class="floe-window-status__illustration" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 112" fill="none" aria-hidden="true"><g stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round">${artwork[kind]}</g></svg>`;
}
