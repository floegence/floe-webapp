// @vitest-environment jsdom
import { createSignal } from 'solid-js';
import { render } from 'solid-js/web';
import { afterEach, describe, expect, it } from 'vitest';
import { ActivityRailIcons, RailGlobe } from '../src/components/icons/ActivityRailIcons';

const disposers: Array<() => void> = [];
afterEach(() => { disposers.splice(0).forEach(dispose => dispose()); document.body.innerHTML = ''; });
describe('light-fill activity rail icons', () => {
  it.each(Object.entries(ActivityRailIcons))('%s changes face without changing the SVG owner', (_name, Icon) => {
    const host = document.createElement('div'); document.body.append(host);
    const [active, setActive] = createSignal(false);
    disposers.push(render(() => <Icon active={active()} class="rail-slot" />, host));
    const svg = host.querySelector('svg');
    expect(svg?.querySelector('[data-floe-rail-part="face"]')).not.toBeNull();
    setActive(true);
    expect(host.querySelector('svg')).toBe(svg);
    expect(svg?.getAttribute('data-floe-rail-active')).toBe('true');
    expect(svg?.querySelector('[data-floe-rail-part="solid"]')).not.toBeNull();
    expect(svg?.querySelector('[data-floe-rail-part="face"]')).toBeNull();
    setActive(false);
    expect(svg?.querySelector('[data-floe-rail-part="outline"]')).not.toBeNull();
    expect(svg?.getAttribute('class')).toBe('rail-slot');
  });
  it('keeps cutouts local when multiple rails render the same glyph', () => {
    const host = document.createElement('div'); document.body.append(host);
    disposers.push(render(() => <><RailGlobe active /><RailGlobe active /></>, host));
    const ids = Array.from(host.querySelectorAll('mask'), mask => mask.id);
    expect(new Set(ids).size).toBe(2);
    host.querySelectorAll('svg').forEach((svg, index) => {
      expect(svg.querySelector('[data-floe-rail-part="solid"]')?.getAttribute('mask')).toBe('url(#' + ids[index] + ')');
    });
  });
});
