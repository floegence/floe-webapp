import type { JSX } from 'solid-js';
import { ThemeProvider } from '../context/ThemeContext';
import { NotificationProvider } from '../context/NotificationContext';
import { ComponentRegistryProvider } from '../context/ComponentRegistry';
import { LayoutProvider } from '../context/LayoutContext';
import { CommandProvider } from '../context/CommandContext';

export interface FloeProviderProps {
  children: JSX.Element;
  /**
   * Allows consumers to inject their own providers *after* ThemeProvider,
   * while ensuring the inner tree is created inside the injected provider.
   */
  wrapAfterTheme?: (renderChildren: () => JSX.Element) => JSX.Element;
}

/**
 * Convenience provider that wires up Floe core contexts in the recommended order.
 * Protocol/Router are intentionally kept outside of core to avoid hard coupling.
 */
export function FloeProvider(props: FloeProviderProps) {
  const renderInner = (): JSX.Element => (
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
      {props.wrapAfterTheme ? props.wrapAfterTheme(renderInner) : renderInner()}
    </ThemeProvider>
  );
}
