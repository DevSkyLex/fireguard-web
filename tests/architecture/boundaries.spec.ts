import { describe, expect, it } from 'vitest';
import { analyzeBoundaries } from './support/boundaries';
import { fixture } from './support/fixture';

describe('dependency resolution', () => {
  it('resolves inherited paths relative to a configuration in another directory', () => {
    const root = fixture({
      'config/base.json': JSON.stringify({
        compilerOptions: {
          module: 'preserve',
          moduleResolution: 'bundler',
          paths: { '@owner/*': ['../src/app/features/*'] },
        },
      }),
      'tsconfig.json': '{"extends":"./config/base.json"}',
      'src/app/core/client.ts': "import { value } from '@owner/alerts';",
      'src/app/features/alerts/FEATURE.md': '# Alerts',
      'src/app/features/alerts/index.ts': 'export const value = 1;',
    });
    expect(analyzeBoundaries(root).violations[0]?.rule).toBe('core-independence');
  });

  it('gives exact aliases precedence over an overlapping wildcard', () => {
    const root = fixture({
      'tsconfig.json': JSON.stringify({
        compilerOptions: {
          module: 'preserve',
          moduleResolution: 'bundler',
          paths: { '@alias/*': ['./external/*'], '@alias/missing': ['./src/app/core/missing'] },
        },
      }),
      'src/app/core/client.ts': "import '@alias/missing';",
    });
    expect(analyzeBoundaries(root).violations[0]).toMatchObject({
      rule: 'resolved-imports',
      specifier: '@alias/missing',
    });
  });

  it('uses the most specific wildcard and all fallback mappings', () => {
    const root = fixture({
      'tsconfig.json': JSON.stringify({
        compilerOptions: {
          module: 'preserve',
          moduleResolution: 'bundler',
          paths: {
            '@alias/*': ['./external/*'],
            '@alias/features/*': ['./missing/*', './src/app/features/*'],
          },
        },
      }),
      'src/app/core/client.ts': "import '@alias/features/alerts';",
      'src/app/features/alerts/FEATURE.md': '# Alerts',
      'src/app/features/alerts/index.ts': 'export const value = 1;',
    });
    expect(analyzeBoundaries(root).violations[0]?.rule).toBe('core-independence');
  });

  it('reports unresolved inherited aliases and normalizes index paths', () => {
    const root = fixture({
      'src/app/core/client.ts': "import '@custom/missing'; import './helper/index';",
      'src/app/core/helper/index.ts': 'export const value = 1;',
    });
    const result = analyzeBoundaries(root);
    expect(result.violations[0]).toMatchObject({
      rule: 'resolved-imports',
      specifier: '@custom/missing',
    });
    expect(result.dependencies[0]?.target).toBe('src/app/core/helper/index.ts');
  });

  it('recognizes a literal template import and leaves computed runtime paths to the bundler', () => {
    const root = fixture({
      'src/app/core/client.ts':
        'const a = import(`@features/alerts`); const path = "@features/alerts"; const b = import(path);',
      'src/app/features/alerts/FEATURE.md': '# Alerts',
      'src/app/features/alerts/index.ts': 'export const value = 1;',
    });
    expect(analyzeBoundaries(root).violations).toHaveLength(1);
  });
  it('uses inherited compiler aliases, including aliases absent from the old checker', () => {
    const root = fixture({
      'src/app/core/client.ts': "import { value } from '@custom/alerts';",
      'src/app/features/alerts/FEATURE.md': '# Alerts',
      'src/app/features/alerts/index.ts': 'export const value = 1;',
    });
    const result = analyzeBoundaries(root);
    expect(result.dependencies).toHaveLength(1);
    expect(result.violations[0]?.rule).toBe('core-independence');
  });

  it('resolves bare aliases and relative imports', () => {
    const root = fixture({
      'src/app/index.ts': 'export const value = 1;',
      'src/app/core/client.ts': "import { value } from '@app'; import { helper } from './helper';",
      'src/app/core/helper.ts': 'export const helper = 1;',
    });
    expect(analyzeBoundaries(root).dependencies.map((edge) => edge.target)).toEqual([
      'src/app/index.ts',
      'src/app/core/helper.ts',
    ]);
  });

  it.each([
    "import type { Value } from '@features/alerts/private';",
    "export { value } from '@features/alerts/private';",
    "const load = () => import('@features/alerts/private');",
    "type Value = import('@features/alerts/private').Value;",
    "import alerts = require('@features/alerts/private');",
  ])('detects boundary violations in %s', (statement) => {
    const root = fixture({
      'src/app/core/client.ts': statement,
      'src/app/features/alerts/FEATURE.md': '# Alerts',
      'src/app/features/alerts/private.ts': 'export const value = 1; export type Value = number;',
    });
    expect(analyzeBoundaries(root).violations.map((entry) => entry.rule)).toEqual([
      'core-independence',
    ]);
  });

  it('reports unresolved local imports with the source line', () => {
    const root = fixture({ 'src/app/core/client.ts': "\nimport { missing } from './missing';" });
    expect(analyzeBoundaries(root).violations[0]).toMatchObject({
      rule: 'resolved-imports',
      source: 'src/app/core/client.ts',
      line: 2,
      specifier: './missing',
    });
  });

  it('ignores external packages and owner-private seams used by tests', () => {
    const root = fixture({
      'src/app/core/client.ts': "import { signal } from '@angular/core';",
      'src/app/core/client.spec.ts': "import { missing } from './missing';",
      'src/app/core/client.test.ts': "import { missing } from './missing';",
      'src/app/core/testing/helper.ts': "import { missing } from '../missing';",
    });
    expect(analyzeBoundaries(root)).toEqual({ dependencies: [], violations: [] });
  });
});

describe('ownership and public surfaces', () => {
  it('detects relative imports from core into layouts', () => {
    const root = fixture({
      'src/app/core/client.ts': "import { value } from '../layouts/shell';",
      'src/app/layouts/shell.ts': 'export const value = 1;',
    });
    expect(analyzeBoundaries(root).violations[0]?.rule).toBe('core-independence');
  });

  it.each(['ports/index.ts', 'ports/session/index.ts'])('allows shared to consume %s', (entry) => {
    const root = fixture({
      'src/app/shared/client.ts':
        "import { value } from '@features/alerts/" +
        entry.replace('/index.ts', '').replace('index.ts', '') +
        "';",
      'src/app/features/alerts/FEATURE.md': '# Alerts',
      ['src/app/features/alerts/' + entry]: 'export const value = 1;',
    });
    expect(analyzeBoundaries(root).violations).toEqual([]);
  });

  it.each(['models/index.ts', 'ports/private/deep/index.ts'])(
    'rejects shared imports from %s',
    (entry) => {
      const root = fixture({
        'src/app/shared/client.ts':
          "import { value } from '@features/alerts/" + entry.slice(0, -'/index.ts'.length) + "';",
        'src/app/features/alerts/FEATURE.md': '# Alerts',
        ['src/app/features/alerts/' + entry]: 'export const value = 1;',
      });
      expect(analyzeBoundaries(root).violations[0]?.rule).toBe('shared-ports');
    },
  );

  it('allows private imports within one nested feature', () => {
    const root = fixture({
      'src/app/features/organization/FEATURE.md': '# Organization',
      'src/app/features/organization/features/alerts/FEATURE.md': '# Alerts',
      'src/app/features/organization/features/alerts/client.ts':
        "import { value } from './private';",
      'src/app/features/organization/features/alerts/private.ts': 'export const value = 1;',
    });
    expect(analyzeBoundaries(root).violations).toEqual([]);
  });

  it('treats a nested feature as a different owner from its parent', () => {
    const root = fixture({
      'src/app/features/organization/FEATURE.md': '# Organization',
      'src/app/features/organization/client.ts':
        "import { value } from './features/alerts/private';",
      'src/app/features/organization/features/alerts/FEATURE.md': '# Alerts',
      'src/app/features/organization/features/alerts/private.ts': 'export const value = 1;',
    });
    expect(analyzeBoundaries(root).violations[0]?.rule).toBe('feature-public-api');
  });

  it('allows the published concern barrel', () => {
    const root = fixture({
      'src/app/features/organization/FEATURE.md': '# Organization',
      'src/app/features/organization/client.ts': "import { value } from '@features/alerts/models';",
      'src/app/features/alerts/FEATURE.md': '# Alerts',
      'src/app/features/alerts/models/index.ts': 'export const value = 1;',
    });
    expect(analyzeBoundaries(root).violations).toEqual([]);
  });

  it('rejects a private barrel even when its filename is index.ts', () => {
    const root = fixture({
      'src/app/features/organization/FEATURE.md': '# Organization',
      'src/app/features/organization/client.ts':
        "import { value } from '@features/alerts/state/private';",
      'src/app/features/alerts/FEATURE.md': '# Alerts',
      'src/app/features/alerts/state/private/index.ts': 'export const value = 1;',
    });
    expect(analyzeBoundaries(root).violations[0]?.rule).toBe('feature-public-api');
  });

  it('allows a narrow entry point explicitly recorded in the feature contract', () => {
    const root = fixture({
      'src/app/features/organization/FEATURE.md': '# Organization',
      'src/app/features/organization/client.ts':
        "import { value } from '@features/alerts/providers/bootstrap';",
      'src/app/features/alerts/FEATURE.md':
        '# Alerts\n\n## Public entry points\n\n| Entry point | Consumers |\n| --- | --- |\n| `providers/bootstrap` | `organization` |',
      'src/app/features/alerts/providers/bootstrap/index.ts': 'export const value = 1;',
    });
    expect(analyzeBoundaries(root).violations).toEqual([]);
  });

  it.each(['alerts.routes.ts', 'ui/pages/alerts/alerts.component.ts'])(
    'allows a route to lazily load %s',
    (entry) => {
      const root = fixture({
        'src/app/app.routes.ts':
          "const load = () => import('@features/alerts/" + entry.slice(0, -3) + "');",
        'src/app/features/alerts/FEATURE.md': '# Alerts',
        ['src/app/features/alerts/' + entry]: 'export const value = 1;',
      });
      expect(analyzeBoundaries(root).violations).toEqual([]);
    },
  );

  it.each([
    ['app.routes.ts', "const load = () => import('@features/alerts/private');"],
    ['client.ts', "const load = () => import('@features/alerts/alerts.routes');"],
    ['app.routes.ts', "import { value } from '@features/alerts/alerts.routes';"],
  ])('rejects an unauthorized lazy/static dependency from %s', (source, statement) => {
    const root = fixture({
      ['src/app/' + source]: statement,
      'src/app/features/alerts/FEATURE.md': '# Alerts',
      'src/app/features/alerts/private.ts': 'export const value = 1;',
      'src/app/features/alerts/alerts.routes.ts': 'export const value = 1;',
    });
    expect(analyzeBoundaries(root).violations[0]?.rule).toBe('feature-public-api');
  });
});
