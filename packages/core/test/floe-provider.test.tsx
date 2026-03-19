import { createContext, useContext, type JSX } from 'solid-js';
import { describe, expect, it } from 'vitest';
import { renderToString } from 'solid-js/web';
import { FloeProvider } from '../src/app/FloeProvider';
import { useTheme } from '../src/context/ThemeContext';

function ThemeConsumer() {
  const theme = useTheme();
  return <div>{theme.resolvedTheme()}</div>;
}

function ThemePresetConsumer() {
  const theme = useTheme();
  return <div>{theme.themePreset()?.name ?? 'none'}</div>;
}

const WrapperContext = createContext<string>();

function WrapperProvider(props: { children: JSX.Element }) {
  return (
    <WrapperContext.Provider value="wrapped">
      {props.children}
    </WrapperContext.Provider>
  );
}

function WrapperConsumer() {
  const value = useContext(WrapperContext);
  if (!value) throw new Error('WrapperContext not found');
  return <div>{value}</div>;
}

describe('FloeProvider', () => {
  it('should provide ThemeContext to children', () => {
    const html = renderToString(() => (
      <FloeProvider>
        <ThemeConsumer />
      </FloeProvider>
    ));

    expect(html).toContain('light');
  });

  it('should create inner tree inside wrapAfterTheme provider', () => {
    const html = renderToString(() => (
      <FloeProvider wrapAfterTheme={(renderChildren) => <WrapperProvider>{renderChildren()}</WrapperProvider>}>
        <WrapperConsumer />
      </FloeProvider>
    ));

    expect(html).toContain('wrapped');
  });

  it('should expose the configured default theme preset to children', () => {
    const html = renderToString(() => (
      <FloeProvider
        config={{
          theme: {
            defaultPreset: 'ocean',
            presets: [
              { name: 'default', displayName: 'Default' },
              { name: 'ocean', displayName: 'Ocean' },
            ],
          },
        }}
      >
        <ThemePresetConsumer />
      </FloeProvider>
    ));

    expect(html).toContain('ocean');
  });
});
