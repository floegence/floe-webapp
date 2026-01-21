import type { JSX } from 'solid-js';
import { ThemeProvider } from '../context/ThemeContext';
import { NotificationProvider } from '../context/NotificationContext';
import { ComponentRegistryProvider } from '../context/ComponentRegistry';
import { LayoutProvider } from '../context/LayoutContext';
import { CommandProvider } from '../context/CommandContext';

export interface FloeProviderProps {
  children: JSX.Element;
  wrapAfterTheme?: (children: JSX.Element) => JSX.Element;
}

/**
 * Convenience provider that wires up Floe core contexts in the recommended order.
 * Protocol/Router are intentionally kept outside of core to avoid hard coupling.
 */
export function FloeProvider(props: FloeProviderProps) {
  const inner = (
    <NotificationProvider>
      <ComponentRegistryProvider>
        <LayoutProvider>
          <CommandProvider>{props.children}</CommandProvider>
        </LayoutProvider>
      </ComponentRegistryProvider>
    </NotificationProvider>
  );

  return (
    <ThemeProvider>
      {props.wrapAfterTheme ? props.wrapAfterTheme(inner) : inner}
    </ThemeProvider>
  );
}
