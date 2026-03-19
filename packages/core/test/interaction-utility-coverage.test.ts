import { describe, it } from 'vitest';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditInteractionUtilities, formatInteractionUtilityAudit } from '../scripts/interactionUtilityAudit.mjs';

const testDir = dirname(fileURLToPath(import.meta.url));

describe('interaction utility coverage', () => {
  it('defines every token-driven hover interaction referenced by core runtime components', () => {
    const report = auditInteractionUtilities({
      sourceRoot: resolve(testDir, '../src'),
      cssPath: resolve(testDir, '../src/styles/floe.css'),
      extensions: ['.ts', '.tsx', '.js', '.jsx'],
    });

    if (report.missing.length > 0) {
      throw new Error(formatInteractionUtilityAudit(report, 'source interaction utility audit'));
    }
  });
});
