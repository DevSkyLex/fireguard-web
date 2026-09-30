import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  assignedFile,
  changedFiles,
  declarationFindings,
  docblocks,
  formatDocblocks,
} from './check-docblocks.mjs';

function stripDocblocks(source) {
  let clean = source;
  for (const range of docblocks(source).toReversed())
    clean = clean.slice(0, range.pos) + clean.slice(range.end);
  return clean;
}

const requestedFunctionExample = [
  '/**',
  ' * Function formatShortcut',
  ' *',
  ' * @description Formats a shortcut key with the',
  ' * platform-specific modifier.',
  ' *',
  ' * @access public',
  ' * @since 1.0.0',
  ' *',
  ' * @param {ShortcutModifier} modifier - Platform modifier to display.',
  ' * @param {string} key - Shortcut key, including punctuation such as `,`.',
  ' *',
  ' * @returns {string} Human-readable shortcut hint.',
  ' */',
  'export function formatShortcut(modifier: ShortcutModifier, key: string): string { return key; }',
].join('\n');

test('preserves the requested function example exactly and is idempotent', async () => {
  const source = requestedFunctionExample;
  assert.equal(await formatDocblocks(source), source);
  assert.equal(await formatDocblocks(await formatDocblocks(source)), source);
  assert.deepEqual(declarationFindings('src/app/example.ts', source), []);
});

test('restores declaration titles and metadata groups after native tag sorting', async () => {
  const expected = requestedFunctionExample;
  const input = expected
    .replace(' * @access public\n * @since 1.0.0', ' * @since 1.0.0')
    .replace(
      ' * @returns {string} Human-readable shortcut hint.',
      ' * @returns {string} Human-readable shortcut hint.\n *\n * @access public',
    );
  const output = await formatDocblocks(input);
  assert.equal(output, expected);
  assert.equal(stripDocblocks(output), stripDocblocks(input));
  assert.equal(await formatDocblocks(output), output);
});

test('rejects missing or mismatched declaration titles without inventing metadata', async () => {
  const source =
    '/**\n * @description Formats a label.\n * @param {string} value - Displayed text.\n * @returns {string} Displayed label.\n */\nexport function label(value: string): string {return value;}';
  const output = await formatDocblocks(source);
  assert.doesNotMatch(output, /Function label|@since|@version|@author/);
  assert.ok(
    declarationFindings('src/app/label.ts', output).some(
      (finding) => finding.rule === 'docblock-heading',
    ),
  );
  const mismatch = output.replace(' * @description', ' * Function wrong\n *\n * @description');
  assert.ok(
    declarationFindings('src/app/label.ts', mismatch).some(
      (finding) => finding.rule === 'docblock-heading',
    ),
  );
  const matching = mismatch.replace('Function wrong', 'Function label');
  assert.deepEqual(declarationFindings('src/app/label.ts', matching), []);
});

test('preserves fenced examples, generic tags and existing author metadata', async () => {
  const source = requestedFunctionExample.replace(
    ' * @returns {string} Human-readable shortcut hint.',
    ' * @returns {string} Human-readable shortcut hint.\n *\n * @author Existing Author\n *\n * @template T - Existing generic contract.\n *\n * @example\n * ```typescript\n * @readonly\n * class Example {}\n * ```\n *\n * @deprecated Use the existing replacement.',
  );
  const output = await formatDocblocks(source);
  assert.match(output, /@author Existing Author/);
  assert.match(output, /@template T - Existing generic contract\./);
  assert.match(
    output,
    /@example\n \* +```typescript\n \* +@readonly\n \* +class Example \{\}\n \* +```/,
  );
  assert.equal(output.match(/@readonly/g).length, 1);
  assert.match(output, /@deprecated Use the existing replacement\./);
  assert.equal(stripDocblocks(output), stripDocblocks(source));
  assert.equal(await formatDocblocks(output), output);
});

test('native formatting changes only docblocks and is idempotent', async () => {
  const text =
    '/**\n * @description Formats a label.\n * @since 1.0.0\n * @param {string} value - Displayed text.\n * @returns {string} Displayed label.\n */\nexport function label(value: string): string {return `/** ${value} */`;}\n';
  const output = await formatDocblocks(text);
  assert.notEqual(output, text);
  assert.equal(stripDocblocks(output), stripDocblocks(text));
  assert.equal(await formatDocblocks(output), output);
  assert.match(output, /@since 1\.0\.0/);
  assert.match(output, /\*\n \* @returns/);
});

test('comment-like strings, regexes and templates are not documentation', async () => {
  const text = 'const a="/** fake */"; const b=/\\/\\*\\*/; const c=`/** fake */`;\n';
  assert.equal(docblocks(text).length, 0);
  assert.equal(await formatDocblocks(text), text);
});

test('nested class docblocks preserve author, version, regions and executable bytes', async () => {
  const text =
    '/** @class Client\n * @description Owns a label.\n * @version 2.0.0\n * @author Existing Author\n */\nexport class Client {\r\n//#region Fields\r\n/** @description Displayed label.\n * @type {string}\n * @readonly\n * @access public\n * @since 1.0.0\n */\npublic readonly label: string = "label";\r\n//#endregion\r\n}';
  const output = await formatDocblocks(text);
  assert.equal(docblocks(output).length, 2);
  assert.equal(stripDocblocks(output), stripDocblocks(text));
  assert.match(output, /@author Existing Author/);
  assert.match(output, /@version 2\.0\.0/);
  assert.match(output, /@readonly/);
  assert.equal(await formatDocblocks(output), output);
});

test('member documentation, parameter names and missing tags use the declaration checker', () => {
  const text =
    '/** @description A client. */\nexport class Client {\n/** @description Loads a value. */\npublic load(id: string): void {}\n}';
  const findings = declarationFindings('src/app/client.ts', text);
  assert.ok(findings.some((finding) => finding.message.includes('@since')));
  assert.ok(findings.some((finding) => finding.message.includes('@returns')));
  assert.ok(findings.some((finding) => finding.rule === 'docblock-param'));
});

test('parser errors refuse formatting', async () => {
  await assert.rejects(formatDocblocks('export function {'), /Oxfmt failed|Cannot parse/);
});

test('unknown and duplicate parameter tags fail while nested property tags remain valid', () => {
  const text =
    '/** @description Reads options.\n * @param {object} options - Input.\n * @param {string} options.name - Label.\n * @param {string} stale - Removed parameter.\n * @param {object} options - Duplicate.\n * @returns {void}\n */\nexport function read(options: {name: string}): void {}';
  const errors = declarationFindings('src/app/read.ts', text).filter((finding) =>
    finding.message.startsWith('Unknown or duplicate'),
  );
  assert.equal(errors.length, 2);
});

test('changed scope includes staged, unstaged and new files and excludes generated/spec files', () => {
  const temporaryRoot = realpathSync(tmpdir());
  const directory = mkdtempSync(path.join(temporaryRoot, 'fg-docblocks-'));
  const git = (...args) =>
    execFileSync('git', ['-c', 'core.autocrlf=false', ...args], { cwd: directory, stdio: 'pipe' });
  const write = (file, text = 'export const value = 1;\n') => {
    mkdirSync(path.dirname(path.join(directory, file)), { recursive: true });
    writeFileSync(path.join(directory, file), text);
  };
  try {
    git('init', '-q');
    write('src/app/staged.ts');
    write('src/app/unstaged.ts');
    git('add', '.');
    git(
      '-c',
      'user.name=Test',
      '-c',
      'user.email=test@example.invalid',
      'commit',
      '-qm',
      'fixture',
    );
    write('src/app/staged.ts', 'export const value = 2;\n');
    git('add', '.');
    write('src/app/unstaged.ts', 'export const value = 3;\n');
    write('src/app/new.ts');
    write('src/app/new.spec.ts');
    write('src/app/shared/ui/generated.ts');
    assert.deepEqual(changedFiles('HEAD', directory).toSorted(), [
      'src/app/new.ts',
      'src/app/staged.ts',
      'src/app/unstaged.ts',
    ]);
    assert.throws(() => changedFiles('missing-base', directory));
    assert.throws(() => changedFiles('--output=unexpected', directory));
    assert.throws(() => assignedFile('../outside.ts', directory));
    assert.throws(() => assignedFile('src/app/shared/ui/generated.ts', directory));
    assert.throws(() => assignedFile('src/app/new.spec.ts', directory));
    assert.equal(assignedFile('src/app/new.ts', directory), 'src/app/new.ts');
  } finally {
    assert.equal(path.dirname(path.resolve(directory)), temporaryRoot);
    rmSync(directory, { recursive: true, force: true });
  }
});
