import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { analyzeBoundaries, describeViolation } from './support/boundaries';
import { analyzeStructure, runtimeCycles } from './support/structure';

const root = fileURLToPath(new URL('../../', import.meta.url));
const analysis = analyzeBoundaries(root);
const structure = analyzeStructure(root, analysis.dependencies);

describe('Fireguard architectural boundaries', () => {
  it('inspects authored application dependencies', () => {
    expect(analysis.dependencies.length).toBeGreaterThan(0);
  });

  it.each([
    'explicit-exports',
    'private-exports',
    'layout-ports',
    'presentation',
    'feature-contracts',
  ] as const)('%s: follows the structural contract', (rule) => {
    const violations = structure.filter((violation) => violation.rule === rule);
    expect(
      violations,
      violations.map((entry) => `${entry.source}:${entry.line}: ${entry.detail}`).join('\n'),
    ).toHaveLength(0);
  });

  it('has no static execution cycles', () => {
    const cycles = runtimeCycles(analysis.dependencies);
    expect(
      cycles,
      cycles
        .map((cycle) =>
          cycle
            .map((edge) => edge.source + ':' + edge.line)
            .concat(cycle[0].source)
            .join(' -> '),
        )
        .join('\n'),
    ).toHaveLength(0);
  });

  it.each([
    ['core-independence', 'core stays independent of business features and layouts'],
    ['shared-ports', 'shared consumes only published feature ports'],
    ['feature-public-api', 'cross-owner imports use public entry points or lazy route entries'],
    ['resolved-imports', 'local imports resolve with the project TypeScript configuration'],
  ] as const)('%s: %s', (rule, _description) => {
    const violations = analysis.violations.filter((violation) => violation.rule === rule);
    expect(violations, violations.map(describeViolation).join('\n')).toHaveLength(0);
  });
});
