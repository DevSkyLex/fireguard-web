import { describe, expect, it } from 'vitest';
import { analyzeBoundaries } from './support/boundaries';
import { publicEntries } from './support/feature-contracts';
import { fixture } from './support/fixture';
import { analyzeStructure, runtimeCycles } from './support/structure';

function inspect(files: Record<string, string>) {
  const root = fixture(files);
  const analysis = analyzeBoundaries(root);
  return {
    ...analysis,
    structure: analyzeStructure(root, analysis.dependencies),
    cycles: runtimeCycles(analysis.dependencies),
  };
}

describe('public exports', () => {
  it.each([
    "export * from './value';",
    "export type * from './value';",
    "export * as values from './value';",
  ])('rejects aggregate export %s', (statement) => {
    const result = inspect({
      'src/app/core/example/index.ts': statement,
      'src/app/core/example/value.ts': 'export interface Value {}',
    });
    expect(result.structure.map((entry) => entry.rule)).toContain('explicit-exports');
  });

  it('allows explicit value/type aliases and preserves private local page helpers', () => {
    const result = inspect({
      'src/app/features/alerts/FEATURE.md': '# Alerts',
      'src/app/features/alerts/index.ts':
        "export { value as renamed } from './value'; export type { Value } from './value';",
      'src/app/features/alerts/value.ts': 'export const value = 1; export interface Value {}',
      'src/app/features/alerts/ui/pages/list/constants/index.ts':
        "export { value } from './value';",
      'src/app/features/alerts/ui/pages/list/constants/value.ts': 'export const value = 1;',
    });
    expect(result.structure).toEqual([]);
  });

  it.each(['testing', 'private', 'internal', 'data-access/adapters', 'ui/pages/list'])(
    'rejects public leakage from %s',
    (bucket) => {
      const result = inspect({
        'src/app/features/alerts/FEATURE.md': '# Alerts',
        'src/app/features/alerts/index.ts': `export { value } from './${bucket}/value';`,
        [`src/app/features/alerts/${bucket}/value.ts`]: 'export const value = 1;',
      });
      expect(result.structure.map((entry) => entry.rule)).toContain('private-exports');
    },
  );

  it('traces aliased exports through intermediate barrels', () => {
    const result = inspect({
      'src/app/core/example/index.ts': "export { renamed } from './bridge';",
      'src/app/core/example/bridge.ts': "export { value as renamed } from './private/value';",
      'src/app/core/example/private/value.ts': 'export const value = 1;',
    });
    expect(result.structure).toContainEqual(
      expect.objectContaining({ rule: 'private-exports', source: 'src/app/core/example/index.ts' }),
    );
  });

  it('rejects an explicitly internal symbol', () => {
    const result = inspect({
      'src/app/core/example/index.ts': "export { helper } from './value';",
      'src/app/core/example/value.ts': '/** @internal */\nexport function helper() {}',
    });
    expect(result.structure.map((entry) => entry.rule)).toContain('private-exports');
  });

  it('keeps generated Spartan barrels outside authored export rules', () => {
    expect(
      inspect({
        'src/app/shared/ui/example/src/index.ts': "export * from './value';",
        'src/app/shared/ui/example/src/value.ts': 'export const value = 1;',
      }).structure,
    ).toEqual([]);
  });
});

describe('orchestration ownership', () => {
  it('resolves imports followed by a local aliased export before checking layout consumers', () => {
    const result = inspect({
      'src/app/features/alerts/FEATURE.md': '# Alerts',
      'src/app/features/alerts/index.ts':
        "import { Store as Local } from './state/store'; export { Local as Public };",
      'src/app/features/alerts/state/store.ts': 'export class Store {}',
      'src/app/layouts/shell.ts':
        "import { Public } from '../features/alerts'; console.log(Public);",
    });
    expect(result.structure.map((entry) => entry.rule)).toContain('layout-ports');
  });
  it.each(['state', 'data-access', 'services', 'access/services'])(
    'rejects a layout importing concrete %s through an aliased public barrel',
    (bucket) => {
      const result = inspect({
        'src/app/features/alerts/FEATURE.md': '# Alerts',
        'src/app/features/alerts/index.ts': `export { Concrete as PublicName } from './${bucket}/implementation';`,
        [`src/app/features/alerts/${bucket}/implementation.ts`]: 'export class Concrete {}',
        'src/app/layouts/shell.ts':
          "import { PublicName as Service } from '../features/alerts'; console.log(Service);",
      });
      expect(result.structure.map((entry) => entry.rule)).toContain('layout-ports');
    },
  );

  it('allows layout ports and feature-owned shell widgets', () => {
    const result = inspect({
      'src/app/features/alerts/FEATURE.md': '# Alerts',
      'src/app/features/alerts/ports/index.ts': 'export const PORT = 1;',
      'src/app/features/alerts/ui/components/index.ts': 'export class Widget {}',
      'src/app/layouts/shell.ts':
        "import { PORT } from '../features/alerts/ports'; import { Widget } from '../features/alerts/ui/components'; console.log(PORT, Widget);",
    });
    expect(result.structure).toEqual([]);
  });

  it.each(['forms', 'dataviews', 'tables'])(
    'rejects %s depending on state or HTTP orchestration',
    (bucket) => {
      const result = inspect({
        'src/app/features/alerts/FEATURE.md': '# Alerts',
        'src/app/features/alerts/state/index.ts': 'export class Store {}',
        [`src/app/features/alerts/ui/${bucket}/view/view.component.ts`]:
          "import { Store } from '../../../state'; import { HttpClient } from '@angular/common/http'; import { Router } from '@angular/router'; console.log(Store, HttpClient, Router);",
      });
      expect(result.structure.filter((entry) => entry.rule === 'presentation')).toHaveLength(3);
    },
  );

  it('checks explicitly presentational components but allows owned widgets and type-only contracts', () => {
    const result = inspect({
      'src/app/features/alerts/FEATURE.md': '# Alerts',
      'src/app/features/alerts/state/index.ts': 'export class Store {}',
      'src/app/features/alerts/ui/components/view/view.component.ts':
        "import { Store } from '../../../state';\n/** @presentation */\nexport class View { store = Store; }",
      'src/app/features/alerts/ui/components/widget/widget.component.ts':
        "import { Store } from '../../../state'; export class Widget { store = Store; }",
      'src/app/features/alerts/ui/forms/input/input.component.ts':
        "import type { Store } from '../../../state'; export class Input { value?: Store; }",
    });
    expect(result.structure.filter((entry) => entry.rule === 'presentation')).toHaveLength(1);
  });
});

describe('ownership contracts', () => {
  it.each(['alerts', 'organization/features/alerts'])(
    'requires an ownership document for %s',
    (owner) => {
      const result = inspect({
        'src/app/features/organization/FEATURE.md': '# Organization',
        [`src/app/features/${owner}/state/value.ts`]: 'export const value = 1;',
      });
      expect(result.structure).toContainEqual(
        expect.objectContaining({
          rule: 'feature-contracts',
          source: `src/app/features/${owner}/FEATURE.md`,
        }),
      );
    },
  );

  it('ignores code examples, prose mentions and tables outside the public declaration section', () => {
    const doc =
      '# Alerts\nNever import `providers/private`.\n| `providers/private` | `organization` |\n\n## Public entry points\n```md\n| `providers/private` | `organization` |\n```\n\n## Examples\n| `providers/private` | `organization` |';
    expect(publicEntries(doc)).toEqual([]);
    const result = inspect({
      'src/app/features/alerts/FEATURE.md': doc,
      'src/app/features/alerts/providers/private/index.ts': 'export const value = 1;',
      'src/app/features/organization/FEATURE.md': '# Organization',
      'src/app/features/organization/client.ts':
        "import { value } from '@features/alerts/providers/private';",
    });
    expect(result.violations.map((entry) => entry.rule)).toContain('feature-public-api');
  });

  it.each(['missing', 'app/unknown', '../escape'])(
    'rejects invalid public declarations for %s',
    (entry) => {
      const result = inspect({
        'src/app/features/alerts/FEATURE.md': `# Alerts\n## Public entry points\n| Entry point | Consumers |\n| --- | --- |\n| \`${entry}\` | \`unknown\` |`,
        'src/app/features/alerts/value.ts': 'export const value = 1;',
      });
      expect(result.structure.map((value) => value.rule)).toContain('feature-contracts');
    },
  );

  it('rejects a narrow entry for a consumer that its owner has not authorized', () => {
    const result = inspect({
      'src/app/features/alerts/FEATURE.md':
        '# Alerts\n## Public entry points\n| Entry point | Consumers |\n| --- | --- |\n| `providers/bootstrap` | `account` |',
      'src/app/features/alerts/providers/bootstrap/index.ts': 'export const value = 1;',
      'src/app/features/account/FEATURE.md': '# Account',
      'src/app/features/organization/FEATURE.md':
        '# Organization\nMention `@features/alerts/providers/bootstrap`.',
      'src/app/features/organization/client.ts':
        "import { value } from '@features/alerts/providers/bootstrap';",
    });
    expect(result.violations.map((entry) => entry.rule)).toContain('feature-public-api');
  });

  it('does not treat a layout as application composition for bootstrap approval', () => {
    const result = inspect({
      'src/app/features/alerts/FEATURE.md':
        '# Alerts\n## Public entry points\n| Entry point | Consumers |\n| --- | --- |\n| `providers/bootstrap` | `app` |',
      'src/app/features/alerts/providers/bootstrap/index.ts': 'export const value = 1;',
      'src/app/layouts/dashboard/client.ts':
        "import { value } from '@features/alerts/providers/bootstrap';",
    });
    expect(result.violations.map((entry) => entry.rule)).toContain('feature-public-api');
  });
});

describe('execution cycles', () => {
  it('reports cycles through re-exports with concrete source lines', () => {
    const result = inspect({
      'src/app/core/a.ts': "import { b } from './index'; export const a = () => b;",
      'src/app/core/b.ts': "import { a } from './a'; export const b = () => a;",
      'src/app/core/index.ts': "export { b } from './b';",
    });
    expect(result.cycles).toHaveLength(1);
    expect(result.cycles[0]).toHaveLength(3);
    expect(result.cycles[0].every((edge) => edge.line === 1)).toBe(true);
  });

  it.each([
    "import type { B } from './b'; export interface A { b: B; }",
    "import { B } from './b'; export interface A { b: B; }",
    "export const a = () => import('./b');",
  ])('excludes erased types and deferred imports: %s', (statement) => {
    const result = inspect({
      'src/app/core/a.ts': statement,
      'src/app/core/b.ts':
        "import './a'; import type { A } from './a'; export interface B { a: A; }",
    });
    expect(result.cycles).toEqual([]);
  });

  it('detects self imports and disconnected cycles', () => {
    const result = inspect({
      'src/app/core/a.ts': "import './a';",
      'src/app/core/b.ts': "import './c';",
      'src/app/core/c.ts': "import './b';",
    });
    expect(result.cycles.map((cycle) => cycle.length).toSorted()).toEqual([1, 2]);
  });
});
