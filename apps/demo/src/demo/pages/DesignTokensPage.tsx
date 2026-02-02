import { For } from 'solid-js';
import {
  Panel,
  PanelContent,
  useTheme,
} from '@floegence/floe-webapp-core';
import {
  colorTokens,
  typographyTokens,
  fontFamilies,
  spacingTokens,
  radiusTokens,
  animationTokens,
  type ColorToken,
  type TokenCategory,
} from '../data/designTokens';

interface ColorSwatchProps {
  token: ColorToken;
  theme: 'light' | 'dark';
}

function ColorSwatch(props: ColorSwatchProps) {
  const value = () => props.theme === 'dark' && props.token.darkValue
    ? props.token.darkValue
    : props.token.lightValue;

  return (
    <div class="flex items-center gap-3 py-2 px-3 rounded-md border border-border hover:bg-muted/30 transition-colors">
      <div
        class="w-10 h-10 rounded-md border border-border flex-shrink-0 shadow-sm"
        style={{ background: `var(${props.token.variable})` }}
      />
      <div class="flex-1 min-w-0">
        <div class="text-xs font-medium truncate">{props.token.name}</div>
        <code class="text-[10px] text-muted-foreground font-mono">
          {props.token.variable}
        </code>
      </div>
      <div class="text-right flex-shrink-0">
        <code class="text-[10px] text-muted-foreground font-mono block">
          {value()}
        </code>
      </div>
    </div>
  );
}

interface TokenCategoryCardProps {
  category: TokenCategory;
  theme: 'light' | 'dark';
}

function TokenCategoryCard(props: TokenCategoryCardProps) {
  return (
    <div class="space-y-3">
      <div>
        <h3 class="text-sm font-medium">{props.category.name}</h3>
        <p class="text-[11px] text-muted-foreground">{props.category.description}</p>
      </div>
      <div class="space-y-1">
        <For each={props.category.tokens}>
          {(token) => <ColorSwatch token={token} theme={props.theme} />}
        </For>
      </div>
    </div>
  );
}

export function DesignTokensPage() {
  const theme = useTheme();
  const resolvedTheme = () => theme.resolvedTheme() as 'light' | 'dark';

  return (
    <div class="p-4 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div class="space-y-1">
        <h1 class="text-lg font-bold">Design Tokens</h1>
        <p class="text-[11px] text-muted-foreground">
          Design tokens are the visual design atoms of the design system. They define colors, typography, spacing, and more.
          Current theme: <span class="font-medium">{resolvedTheme()}</span>
        </p>
      </div>

      {/* Colors Section */}
      <div class="space-y-4">
        <div class="flex items-center gap-2">
          <div class="w-1 h-4 rounded-full bg-primary" />
          <h2 class="text-sm font-semibold">Colors</h2>
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <For each={colorTokens}>
            {(category) => <TokenCategoryCard category={category} theme={resolvedTheme()} />}
          </For>
        </div>
      </div>

      {/* Typography Section */}
      <div class="space-y-4">
        <div class="flex items-center gap-2">
          <div class="w-1 h-4 rounded-full bg-primary" />
          <h2 class="text-sm font-semibold">Typography</h2>
        </div>

        {/* Font Families */}
        <Panel class="border border-border rounded-md overflow-hidden">
          <PanelContent class="space-y-4">
            <div>
              <h3 class="text-xs font-medium mb-2">Font Families</h3>
              <div class="space-y-2">
                <For each={fontFamilies}>
                  {(font) => (
                    <div class="flex items-center justify-between py-2 px-3 rounded-md border border-border">
                      <div>
                        <div
                          class="text-sm"
                          style={{ 'font-family': font.value }}
                        >
                          {font.name} - The quick brown fox
                        </div>
                        <p class="text-[10px] text-muted-foreground">{font.description}</p>
                      </div>
                      <code class="text-[10px] text-muted-foreground font-mono max-w-48 truncate">
                        {font.value}
                      </code>
                    </div>
                  )}
                </For>
              </div>
            </div>

            {/* Type Scale */}
            <div>
              <h3 class="text-xs font-medium mb-2">Type Scale</h3>
              <div class="overflow-x-auto">
                <table class="w-full text-xs">
                  <thead>
                    <tr class="border-b border-border">
                      <th class="px-3 py-2 text-left font-medium text-muted-foreground">Name</th>
                      <th class="px-3 py-2 text-left font-medium text-muted-foreground">Size</th>
                      <th class="px-3 py-2 text-left font-medium text-muted-foreground">Line Height</th>
                      <th class="px-3 py-2 text-left font-medium text-muted-foreground">Class</th>
                      <th class="px-3 py-2 text-left font-medium text-muted-foreground">Preview</th>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={typographyTokens}>
                      {(token) => (
                        <tr class="border-b border-border last:border-b-0">
                          <td class="px-3 py-2 font-medium">{token.name}</td>
                          <td class="px-3 py-2 font-mono text-muted-foreground">{token.size}</td>
                          <td class="px-3 py-2 font-mono text-muted-foreground">{token.lineHeight}</td>
                          <td class="px-3 py-2">
                            <code class="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono">
                              {token.className}
                            </code>
                          </td>
                          <td class="px-3 py-2">
                            <span style={{ 'font-size': token.size, 'line-height': token.lineHeight }}>
                              Preview text
                            </span>
                          </td>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </table>
              </div>
            </div>
          </PanelContent>
        </Panel>
      </div>

      {/* Spacing Section */}
      <div class="space-y-4">
        <div class="flex items-center gap-2">
          <div class="w-1 h-4 rounded-full bg-primary" />
          <h2 class="text-sm font-semibold">Spacing</h2>
        </div>
        <Panel class="border border-border rounded-md overflow-hidden">
          <PanelContent>
            <div class="overflow-x-auto">
              <table class="w-full text-xs">
                <thead>
                  <tr class="border-b border-border">
                    <th class="px-3 py-2 text-left font-medium text-muted-foreground">Scale</th>
                    <th class="px-3 py-2 text-left font-medium text-muted-foreground">Value</th>
                    <th class="px-3 py-2 text-left font-medium text-muted-foreground">Pixels</th>
                    <th class="px-3 py-2 text-left font-medium text-muted-foreground">Classes</th>
                    <th class="px-3 py-2 text-left font-medium text-muted-foreground">Preview</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={spacingTokens}>
                    {(token) => (
                      <tr class="border-b border-border last:border-b-0">
                        <td class="px-3 py-2 font-medium">{token.name}</td>
                        <td class="px-3 py-2 font-mono text-muted-foreground">{token.value}</td>
                        <td class="px-3 py-2 font-mono text-muted-foreground">{token.pixels}</td>
                        <td class="px-3 py-2">
                          <code class="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono">
                            {token.className}
                          </code>
                        </td>
                        <td class="px-3 py-2">
                          <div
                            class="bg-primary/20 border border-primary/40 rounded"
                            style={{ width: token.value, height: '16px' }}
                          />
                        </td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </div>
          </PanelContent>
        </Panel>
      </div>

      {/* Border Radius Section */}
      <div class="space-y-4">
        <div class="flex items-center gap-2">
          <div class="w-1 h-4 rounded-full bg-primary" />
          <h2 class="text-sm font-semibold">Border Radius</h2>
        </div>
        <Panel class="border border-border rounded-md overflow-hidden">
          <PanelContent>
            <div class="flex flex-wrap gap-4">
              <For each={radiusTokens}>
                {(token) => (
                  <div class="flex flex-col items-center gap-2">
                    <div
                      class="w-16 h-16 bg-primary/20 border-2 border-primary/60"
                      style={{ 'border-radius': token.value }}
                    />
                    <div class="text-center">
                      <div class="text-xs font-medium">{token.name}</div>
                      <code class="text-[10px] text-muted-foreground font-mono">
                        {token.value}
                      </code>
                    </div>
                  </div>
                )}
              </For>
            </div>
          </PanelContent>
        </Panel>
      </div>

      {/* Animations Section */}
      <div class="space-y-4">
        <div class="flex items-center gap-2">
          <div class="w-1 h-4 rounded-full bg-primary" />
          <h2 class="text-sm font-semibold">Animations</h2>
        </div>
        <Panel class="border border-border rounded-md overflow-hidden">
          <PanelContent>
            <div class="overflow-x-auto">
              <table class="w-full text-xs">
                <thead>
                  <tr class="border-b border-border">
                    <th class="px-3 py-2 text-left font-medium text-muted-foreground">Name</th>
                    <th class="px-3 py-2 text-left font-medium text-muted-foreground">Keyframes</th>
                    <th class="px-3 py-2 text-left font-medium text-muted-foreground">Usage</th>
                    <th class="px-3 py-2 text-left font-medium text-muted-foreground">Description</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={animationTokens}>
                    {(token) => (
                      <tr class="border-b border-border last:border-b-0">
                        <td class="px-3 py-2 font-medium">{token.name}</td>
                        <td class="px-3 py-2">
                          <code class="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono">
                            {token.keyframes}
                          </code>
                        </td>
                        <td class="px-3 py-2">
                          <code class="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono">
                            {token.usage}
                          </code>
                        </td>
                        <td class="px-3 py-2 text-muted-foreground">{token.description}</td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </div>
          </PanelContent>
        </Panel>
      </div>
    </div>
  );
}
