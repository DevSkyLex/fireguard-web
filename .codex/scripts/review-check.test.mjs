import assert from 'node:assert/strict';
import test from 'node:test';
import {
  catalogTranslationIds,
  changedRanges,
  customTranslationIds,
  inspectSource,
  missingTranslationFindings,
} from './review-check.mjs';

test('tracks changed lines without treating deletion-only hunks as additions', () => {
  const result = changedRanges(
    '+++ b/src/app/a.ts\n@@ -1,3 +1,0 @@\n@@ -7 +4,2 @@\n+++ b/src/app/b.ts\n@@ -0,0 +1 @@',
  );
  assert.deepEqual(result.get('src/app/a.ts'), [[4, 5]]);
  assert.deepEqual(result.get('src/app/b.ts'), [[1, 1]]);
});

test('does not flag untouched legacy declarations', () => {
  assert.deepEqual(inspectSource('src/app/a.ts', 'class Example { value = 1; }\n\n', [[2, 2]]), []);
});

test('requires explicit property type, access and structured documentation', () => {
  const rules = new Set(
    inspectSource('src/app/a.ts', 'class Example { value = 1; }').map((finding) => finding.rule),
  );
  assert.ok(rules.has('explicit-type'));
  assert.ok(rules.has('explicit-access'));
  assert.ok(rules.has('docblock-tag'));
});

test('accepts a documented readonly template property and typed method', () => {
  const text = `/** @description Example. */
class Example {
  /**
   * @description Count.
   * @access protected
   * @since 1.0.0
   * @type {number}
   * @readonly
   */
  protected readonly count: number = 1;
  /**
   * @description Formats the count.
   * @access protected
   * @since 1.0.0
   * @param {string} prefix - Visible prefix.
   * @returns {string} Label.
   */
  protected label(prefix: string): string { return prefix; }
}`;
  assert.deepEqual(inspectSource('src/app/a.ts', text), []);
});

test('detects runtime code hidden in an interface-named file', () => {
  assert.ok(
    inspectSource('src/app/shared/x/models/x.interface.ts', 'export function run(): void {}').some(
      (finding) => finding.rule === 'model-runtime',
    ),
  );
});

test('retains the sanctioned presentation registry exception', () => {
  const findings = inspectSource(
    'src/app/features/x/models/status-tag/status-tag.util.ts',
    '/** @description Resolves tags.\n * @returns {string} Label. */\nexport function label(): string { return "Ready"; }',
  );
  assert.equal(
    findings.some((finding) => finding.rule === 'model-runtime'),
    false,
  );
});

test('validates drawer API and command ordering without flagging sheet side', () => {
  const findings = inspectSource(
    'src/app/a.html',
    '<hlm-sheet side="bottom"/><hlm-drawer side="bottom"><button hlmDrawerClose (click)="apply()">Apply</button></hlm-drawer>',
  );
  assert.equal(findings.filter((finding) => finding.rule === 'drawer-direction').length, 1);
  assert.equal(
    findings.find((finding) => finding.rule === 'drawer-command-close')?.severity,
    'warning',
  );
  assert.deepEqual(
    inspectSource(
      'src/app/a.html',
      '<hlm-drawer direction="bottom"><button hlmDrawerClose>Cancel</button></hlm-drawer>',
    ),
    [],
  );
});

test('detects actual template $any calls, not strings or comments', () => {
  assert.equal(
    inspectSource('src/app/a.html', '<button (click)="picked($any($event))"></button>').filter(
      (finding) => finding.rule === 'template-any',
    ).length,
    1,
  );
  assert.deepEqual(inspectSource('src/app/a.html', '<p>{{ "$any(value)" }}</p>'), []);
});

test('checks native templates inside control-flow branches', () => {
  const findings = inspectSource(
    'src/app/a.html',
    '@if (visible()) { <hlm-drawer [side]="direction"/> }',
  );
  assert.equal(findings.filter((finding) => finding.rule === 'drawer-direction').length, 1);
});

test('rejects a drawer-close attribute on an anchor where its directive cannot match', () => {
  const findings = inspectSource(
    'src/app/a.html',
    '<a hlmDrawerClose routerLink="/account">Account</a>',
  );
  assert.equal(findings.filter((finding) => finding.rule === 'drawer-close-target').length, 1);
  assert.deepEqual(inspectSource('src/app/a.html', '<button hlmDrawerClose>Close</button>'), []);
});

test('detects command selection paired with automatic drawer dismissal', () => {
  const findings = inspectSource(
    'src/app/a.html',
    '<button hlmCommandItem hlmDrawerClose (selected)="save()"></button>',
  );
  assert.equal(findings.filter((finding) => finding.rule === 'drawer-command-close').length, 1);
});

test('extracts custom source identifiers and XLIFF 1.2 or 2.0 catalog identifiers', () => {
  assert.deepEqual(
    [
      ...customTranslationIds(
        '<p i18n="@@account.title">Title</p>\n$localize`:@@auth.logout:Logout`',
      ),
    ],
    [
      ['account.title', 1],
      ['auth.logout', 2],
    ],
  );
  assert.deepEqual(
    [...catalogTranslationIds('<trans-unit id="account.title"/><unit id="auth.logout"/>')],
    ['account.title', 'auth.logout'],
  );
});

test('reports only new source translations absent from required locale catalogs', () => {
  const findings = missingTranslationFindings(
    new Map([
      ['present.everywhere', { file: 'src/app/a.html', line: 1 }],
      ['missing.es', { file: 'src/app/a.html', line: 2 }],
    ]),
    {
      fr: new Set(['present.everywhere', 'missing.es']),
      es: new Set(['present.everywhere']),
    },
  );
  assert.deepEqual(findings, [
    {
      file: 'src/app/a.html',
      line: 2,
      rule: 'translation-catalog',
      severity: 'error',
      message: 'New translation @@missing.es is missing from: es.',
    },
  ]);
});
