import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(testDir, '../../..');

const forbiddenByFile: Record<string, string[]> = {
  'packages/core/src/components/ui/Progress.tsx': [
    'bg-emerald-500',
    'text-emerald-500',
    'bg-amber-500',
    'text-amber-500',
    'bg-red-500',
    'text-red-500',
    'bg-sky-500',
    'text-sky-500',
    'rgba(255, 255, 255, 0.15)',
  ],
  'packages/core/src/components/chat/status/ConnectionStatus.tsx': ['text-yellow-500', 'text-green-500', 'text-red-500'],
  'packages/core/src/components/chat/blocks/ToolCallBlock.tsx': ['text-blue-500', 'text-green-500', 'text-red-500'],
  'packages/core/src/components/chat/blocks/CodeDiffBlock.tsx': ['rgb(34 197 94)', 'rgb(239 68 68)'],
  'packages/core/src/components/chat/message/MessageMeta.tsx': ['text-red-500'],
  'packages/core/src/components/deck/DropZonePreview.tsx': [
    'slate-',
    'border-red-400',
    'bg-red-200/60',
    'rgba(0,0,0,0.12)',
    'rgba(255,255,255,0.08)',
  ],
  'packages/core/src/components/launchpad/Launchpad.tsx': ['bg-black/70', 'text-white/30', 'bg-white/10'],
  'packages/core/src/components/launchpad/LaunchpadItem.tsx': ['#667eea', '#764ba2', 'text-white/90', 'hover:bg-white/10', 'focus-visible:ring-white/30'],
  'packages/core/src/components/launchpad/LaunchpadSearch.tsx': ['text-white/50', 'bg-white/10', 'border-white/20', 'focus:ring-white/20'],
  'packages/core/src/components/launchpad/LaunchpadPagination.tsx': ['bg-white', 'bg-white/40', 'ring-white/50'],
  'packages/core/src/components/launchpad/LaunchpadGrid.tsx': ['text-white/50'],
  'packages/core/src/components/ui/Card.tsx': ['--primary-rgb', 'via-white/10', 'rgba(255,255,255,0.2)', 'border-white/10'],
  'packages/core/src/components/ui/Charts.tsx': [
    'oklch(0.65 0.18 160)',
    'oklch(0.65 0.18 280)',
    'oklch(0.65 0.18 45)',
    'oklch(0.65 0.18 340)',
  ],
  'packages/core/src/components/ui/styles/ui.css': ['#22c55e', '#38bdf8', '#f59e0b', 'oklch(', 'drop-shadow(0 2px 4px rgba'],
  'packages/core/src/components/chat/styles/chat.css': ['#57a5ff', 'ui-monospace', 'rgb(239 68 68)'],
  'packages/core/src/widgets/MetricsWidget.tsx': ['text-yellow-500', 'text-green-500', 'text-blue-500', 'text-purple-500'],
  'packages/core/src/components/ui/picker/PickerBase.tsx': ['hover:bg-red-500', 'hover:text-white'],
  'packages/core/src/components/ui/Dialog.tsx': ['hover:bg-red-500', 'hover:text-white'],
  'packages/core/src/components/ui/FloatingWindow.tsx': ['hover:bg-red-500', 'hover:text-white'],
  'packages/core/src/components/ui/Tabs.tsx': ['hover:bg-red-500', 'hover:text-white'],
};

describe('design token hardcoded color cleanup', () => {
  it('keeps the audited core surfaces on semantic tokens instead of duplicated hardcoded colors', () => {
    for (const [relativePath, forbiddenPatterns] of Object.entries(forbiddenByFile)) {
      const content = readFileSync(resolve(repoRoot, relativePath), 'utf8');
      for (const pattern of forbiddenPatterns) {
        expect(content, `${relativePath} should not contain ${pattern}`).not.toContain(pattern);
      }
    }
  });

  it('removes the demo-local token data source and consumes the public core contract directly', () => {
    const designTokensPage = readFileSync(
      resolve(repoRoot, 'apps/demo/src/demo/pages/DesignTokensPage.tsx'),
      'utf8',
    );

    expect(designTokensPage).not.toContain('../data/designTokens');
    expect(designTokensPage).toContain('floeColorTokenCategories');
    expect(existsSync(resolve(repoRoot, 'apps/demo/src/demo/data/designTokens.ts'))).toBe(false);
  });
});
