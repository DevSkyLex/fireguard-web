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
  ' * @description',
  ' * Formats a shortcut key with the',
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

test('moves description prose onto the following line without changing source or examples', async () => {
  const input = requestedFunctionExample
    .replace(' * @description\n * Formats', ' * @description Formats')
    .replace(
      ' * @returns {string} Human-readable shortcut hint.',
      ' * @returns {string} Human-readable shortcut hint.\n *\n * @example\n * ```typescript\n * @description Keep this example on its authored line.\n * ```',
    );
  const output = await formatDocblocks(input);
  assert.match(output, /\* @description\n \* Formats a shortcut/);
  assert.ok(output.includes(' * @description Keep this example on its authored line.'));
  assert.equal(stripDocblocks(output), stripDocblocks(input));
  assert.equal(await formatDocblocks(output), output);
});

test('keeps method identity tags and removes repeated native aliases idempotently', async () => {
  const source = [
    'export class Client {',
    '  /**',
    '   * Method load',
    '   * @method load',
    '   *',
    '   * @description',
    '   * Loads the current client value.',
    '   *',
    '   * @access public',
    '   * @since 1.0.0',
    '   *',
    '   * @returns {void}',
    '   *',
    '   * @function load',
    '   *',
    '   * @function load',
    '   */',
    '  public load(): void {}',
    '}',
  ].join('\n');
  const output = await formatDocblocks(source);
  assert.equal(output.match(/@method load/g)?.length, 1);
  assert.doesNotMatch(output, /@function load/);
  assert.match(output, /Method load\n   \* @method load\n   \*\n   \* @description/);
  assert.equal(stripDocblocks(output), stripDocblocks(source));
  assert.equal(await formatDocblocks(output), output);
});

test('preserves constructor identity and all three class regions over repeated formatting', async () => {
  const source = [
    '/**',
    ' * Class Client',
    ' * @class Client',
    ' *',
    ' * @description',
    ' * Owns the displayed client label.',
    ' */',
    'export class Client {',
    '  //#region Properties',
    '  /**',
    '   * Property label',
    '   *',
    '   * @description',
    '   * Label displayed by this client.',
    '   *',
    '   * @access public',
    '   * @since 1.0.0',
    '   *',
    '   * @type {string}',
    '   */',
    '  public label: string = "";',
    '  //#endregion',
    '  //#region Constructor',
    '  /**',
    '   * Constructor',
    '   * @constructor',
    '   *',
    '   * @description',
    '   * Initializes the client label.',
    '   *',
    '   * @access public',
    '   * @since 1.0.0',
    '   */',
    '  public constructor() {}',
    '  //#endregion',
    '  //#region Methods',
    '  /**',
    '   * Method clear',
    '   * @method clear',
    '   *',
    '   * @description',
    '   * Clears the displayed label.',
    '   *',
    '   * @access public',
    '   * @since 1.0.0',
    '   *',
    '   * @returns {void}',
    '   */',
    '  public clear(): void { this.label = ""; }',
    '  //#endregion',
    '}',
  ].join('\n');
  const output = await formatDocblocks(source);
  assert.equal(output.match(/@constructor/g)?.length, 1);
  assert.equal(output.match(/@class Client/g)?.length, 1);
  assert.equal(output.match(/@method clear/g)?.length, 1);
  assert.equal(stripDocblocks(output), stripDocblocks(source));
  assert.equal(await formatDocblocks(output), output);
  assert.deepEqual(declarationFindings('src/app/client.ts', output), []);
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

test('skips anonymous inline type and runtime object members while checking named declarations', () => {
  const source = [
    'export interface Named {',
    '  /** Incorrect named member heading. */',
    '  label: string;',
    '}',
    'export type NamedAlias = {',
    '  /** Incorrect named method heading. */',
    '  load(): void;',
    '  nested: { /** Authored nested shape note. */ value: string };',
    '};',
    'const dialog = input<{ /** Authored generic shape note. */ title: string }>();',
    'const hooks = {',
    '  /** Authored lifecycle explanation, preserved without a method title. */',
    '  onInit(): void {},',
    '};',
    'const literal: { /** Authored inline shape note. */ id: string } = { id: "" };',
  ].join('\n');
  const headings = declarationFindings('src/app/example.ts', source).filter(
    (finding) => finding.rule === 'docblock-heading',
  );
  assert.deepEqual(
    headings.map((finding) => finding.message),
    ['Use the declaration title Property label.', 'Use the declaration title Method load.'],
  );
});

test('keeps the type alias tag after native typedef normalization', async () => {
  const source = [
    '/**',
    ' * Type OutboxKind',
    ' *',
    ' * @description',
    ' * Supported operations replayed by the messaging outbox.',
    ' *',
    ' * @type OutboxKind',
    ' */',
    'export type OutboxKind = "message.send";',
  ].join('\n');
  const output = await formatDocblocks(source);
  assert.match(output, /@type OutboxKind/);
  assert.doesNotMatch(output, /@typedef/);
  assert.equal(stripDocblocks(output), stripDocblocks(source));
  assert.equal(await formatDocblocks(output), output);
  assert.deepEqual(declarationFindings('src/app/outbox-kind.ts', output), []);
});

test('retains title-only blocks among described declarations without losing alignment', async () => {
  const source = [
    '/** Constant FIRST_PAGE */',
    'const FIRST_PAGE = 1;',
    requestedFunctionExample,
    '/** Constant DEFAULT_PAGE_SIZE */',
    'const DEFAULT_PAGE_SIZE = 20;',
  ].join('\n');
  const output = await formatDocblocks(source);
  assert.equal(docblocks(output).length, 3);
  assert.match(output, /\/\*\*\n \* Constant FIRST_PAGE\n \*\//);
  assert.match(output, /\/\*\*\n \* Constant DEFAULT_PAGE_SIZE\n \*\//);
  assert.equal(stripDocblocks(output), stripDocblocks(source));
  assert.equal(await formatDocblocks(output), output);
  assert.deepEqual(declarationFindings('src/app/example.ts', output), []);
});

test('aligns comment stars with their original declaration indentation', async () => {
  const source = [
    'export class Client {',
    '  /**',
    ' * Property label',
    ' *',
    ' * @description',
    ' * Displayed client label.',
    ' *',
    ' * @access public',
    ' * @since 1.0.0',
    ' *',
    ' * @type {string}',
    ' */',
    '  public label: string = "";',
    '}',
  ].join('\n');
  const output = await formatDocblocks(source);
  assert.match(output, /  \/\*\*\n   \* Property label\n/);
  assert.match(output, /   \*\/\n  public label/);
  assert.equal(stripDocblocks(output), stripDocblocks(source));
  assert.equal(await formatDocblocks(output), output);
});

test('requires docblocks on named type members and overloaded implementations only', () => {
  const source = [
    'export interface Named { label: string; nested: { inner: string }; }',
    'export type Alias = { load(): void; payload: { value: string } };',
    'const configured = input<{ value: string }>();',
    'export class Client { public load(): void; public load(): void {} }',
    'const hooks = { onInit(): void {} };',
  ].join('\n');
  const missing = declarationFindings('src/app/example.ts', source).filter(
    (finding) => finding.rule === 'docblock-missing',
  );
  assert.equal(missing.filter((finding) => finding.message.endsWith('Property label.')).length, 1);
  assert.equal(missing.filter((finding) => finding.message.endsWith('Method load.')).length, 3);
  assert.ok(missing.some((finding) => finding.message.endsWith('Property nested.')));
  assert.ok(missing.some((finding) => finding.message.endsWith('Property payload.')));
  assert.ok(
    missing.every((finding) => !/Property (inner|value)|Method onInit/.test(finding.message)),
  );
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

test('preserves declaration tags following a multiline route description', async () => {
  const source = [
    '/**',
    ' * Function downloadAttachment',
    ' *',
    ' * @description',
    ' * Reads attachment content (`GET',
    ' * /api/organizations/{organizationId}/equipment/{equipmentId}/attachments/{attachmentId}/download`).',
    ' * The caller saves the returned Blob because a bare `<a href>` cannot carry credentials.',
    ' *',
    ' * @access public',
    ' * @since 1.1.0',
    ' *',
    ' * @param {string} attachmentId - Attachment to download.',
    ' *',
    ' * @returns {Blob} Attachment content.',
    ' */',
    'export function downloadAttachment(attachmentId: string): Blob { return new Blob(); }',
  ].join('\n');
  const output = await formatDocblocks(source);
  assert.match(output, /\n \* @access public/);
  assert.match(output, /\n \* @since 1\.1\.0/);
  assert.match(output, /\n \* @param \{string\} attachmentId/);
  assert.match(output, /\n \* @returns \{Blob\}/);
  assert.deepEqual(declarationFindings('src/app/download.ts', output), []);
  assert.equal(stripDocblocks(output), stripDocblocks(source));
  assert.equal(await formatDocblocks(output), output);
});

test('accepts Function titles for named arrow and function expressions', () => {
  for (const initializer of [
    '(value: number): number => value',
    'function (value: number): number { return value; }',
  ]) {
    const source = [
      '/**',
      ' * Function identity',
      ' *',
      ' * @description',
      ' * Returns the supplied value.',
      ' */',
      'export const identity = ' + initializer + ';',
    ].join('\n');
    assert.deepEqual(declarationFindings('src/app/identity.ts', source), []);
  }
});

test('preserves multiple fenced examples and shorter markers inside a longer fence', async () => {
  const examples = [
    ' * @example',
    ' * ````typescript',
    ' * const example = "keep the authored spacing"',
    ' * ```',
    ' * @param {number} nested - Example content, not a declaration tag.',
    ' * ```',
    ' * ````',
    ' *',
    ' * @example',
    ' * ~~~typescript',
    ' * const second=2',
    ' * ~~~',
  ].join('\n');
  const source = requestedFunctionExample.replace(
    ' * @returns {string} Human-readable shortcut hint.',
    ' * @returns {string} Human-readable shortcut hint.\n *\n' + examples,
  );
  const output = await formatDocblocks(source);
  assert.ok(output.includes(examples));
  assert.equal(stripDocblocks(output), stripDocblocks(source));
  assert.equal(await formatDocblocks(output), output);
});
