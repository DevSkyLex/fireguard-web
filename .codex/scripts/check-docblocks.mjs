import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { format } from 'oxfmt';
import ts from 'typescript';
import { inspectSource } from './review-check.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const profile = JSON.parse(readFileSync(path.join(root, '.oxfmtrc.comments.json'), 'utf8'));

/** Collect real JSDoc trivia using parser boundaries, excluding strings and template text. */
export function docblocks(text, file = 'source.ts') {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  if (source.parseDiagnostics.length) throw new Error(`Cannot parse ${file}; refusing to rewrite.`);
  const ranges = new Map();
  const visit = (node) => {
    for (const range of [
      ...(ts.getLeadingCommentRanges(text, node.pos) ?? []),
      ...(ts.getTrailingCommentRanges(text, node.end) ?? []),
    ]) {
      if (text.startsWith('/**', range.pos)) ranges.set(range.pos, range);
    }
    node.getChildren(source).forEach(visit);
  };
  visit(source);
  return [...ranges.values()].toSorted((a, b) => a.pos - b.pos);
}

/** Read comment content without consuming executable source or example indentation. */
function commentLines(block) {
  const lines = block
    .slice(3, -2)
    .replaceAll('\r\n', '\n')
    .split('\n')
    .map((line, index) => (index === 0 ? line.trimStart() : line.replace(/^[ \t]*\* ?/, '')));
  while (lines.length && !lines[0].trim()) lines.shift();
  while (lines.length && !lines.at(-1).trim()) lines.pop();
  return lines;
}

/** Keep the indentation provided by the native formatter for this declaration. */
function renderComment(block, lines, indentation) {
  const prefix = indentation ?? block.match(/\n([ \t]*)\*/)?.[1] ?? ' ';
  return (
    '/**\n' +
    lines.map((line) => prefix + '*' + (line ? ' ' + line : '')).join('\n') +
    '\n' +
    prefix +
    '*/'
  );
}

const TITLE =
  /^(?:(?:Class|Component|Directive|Service|Strategy|Interface|Type|Property|Method|Function|Constant|Configuration|Enum|Trait) \S.*|Constructor)$/;
const IDENTITY = new Set(['class', 'interface', 'method', 'constructor', 'static', 'readonly']);
const METADATA = ['access', 'category', 'version', 'since'];

/** Record declaration tags outside authored fenced examples. */
function tagNames(block, title) {
  const names = new Set();
  let fence;
  for (const line of commentLines(block)) {
    const marker = line.match(/^[ \t]*(\u0060{3,}|~{3,})/);
    if (marker) {
      if (!fence) fence = marker[1];
      else if (
        fence[0] === marker[1][0] &&
        marker[1].length >= fence.length &&
        line.slice(line.indexOf(marker[1]) + marker[1].length).trim() === ''
      )
        fence = undefined;
      continue;
    }
    if (fence) continue;
    let name = line.match(/^@([\w-]+)\b/)?.[1];
    if (!name) continue;
    if (title?.startsWith('Method ') && name === 'function') name = 'method';
    if (title === 'Constructor' && name === 'class') name = 'constructor';
    if (title?.startsWith('Type ') && name === 'typedef') name = 'type';
    names.add(name);
  }
  return names;
}

/** Restore the title and FireGuard tag groups after native text wrapping. */
function structureComment(block, title, indentation) {
  const sections = [];
  let current;
  let fence;
  for (const line of commentLines(block)) {
    const tag = !fence && line.match(/^@([\w-]+)\b/);
    if (tag) {
      current = { name: tag[1], lines: [] };
      sections.push(current);
    } else if (!current) {
      current = { name: '', lines: [] };
      sections.push(current);
    }
    current.lines.push(line);
    const marker = line.match(/^[ \t]*(\u0060{3,}|~{3,})/);
    if (marker) {
      if (!fence) fence = marker[1];
      else if (
        fence[0] === marker[1][0] &&
        marker[1].length >= fence.length &&
        line.slice(line.indexOf(marker[1]) + marker[1].length).trim() === ''
      )
        fence = undefined;
    }
  }
  for (const section of sections) {
    while (section.lines.length && !section.lines.at(-1).trim()) section.lines.pop();
    if (title?.startsWith('Method ') && section.name === 'function') {
      section.name = 'method';
      section.lines[0] = section.lines[0].replace(/^@function\b/, '@method');
    }
    if (title === 'Constructor' && section.name === 'class') {
      section.name = 'constructor';
      section.lines[0] = section.lines[0].replace(/^@class\b/, '@constructor');
    }
    if (title?.startsWith('Type ') && section.name === 'typedef') {
      section.name = 'type';
      section.lines[0] = section.lines[0].replace(/^@typedef\b/, '@type');
    }
    if (section.name === 'description') {
      const description = section.lines[0].replace(/^@description[ \t]*/, '');
      section.lines[0] = '@description';
      if (description) section.lines.splice(1, 0, description);
    }
  }
  const identity = new Set();
  const groups = [
    sections.filter((section) => {
      if (!IDENTITY.has(section.name)) return false;
      const content = section.lines.join('\n');
      if (identity.has(content)) return false;
      identity.add(content);
      return true;
    }),
    sections.filter((section) => section.name === '' || section.name === 'description'),
    sections
      .filter((section) => METADATA.includes(section.name))
      .toSorted((left, right) => METADATA.indexOf(left.name) - METADATA.indexOf(right.name)),
    sections.filter((section) => ['author', 'copyright', 'license'].includes(section.name)),
    sections.filter((section) => ['template', 'typeParam'].includes(section.name)),
    sections.filter((section) => section.name === 'type'),
    sections.filter((section) => section.name === 'param'),
    sections.filter((section) => ['returns', 'return'].includes(section.name)),
    sections.filter((section) => ['throws', 'exception'].includes(section.name)),
  ];
  const known = new Set([
    ...groups.flat(),
    ...sections.filter((section) => IDENTITY.has(section.name)),
  ]);
  groups.push(...sections.filter((section) => !known.has(section)).map((section) => [section]));
  const lines = [];
  if (title) lines.push(title);
  for (const [index, group] of groups.entries()) {
    if (!group.length) continue;
    if (lines.length && index !== 0) lines.push('');
    lines.push(...group.flatMap((section) => section.lines));
  }
  return renderComment(block, lines, indentation);
}

/** Wrap prose with Oxfmt, preserving declaration titles, tag groups and executable bytes. */
export async function formatDocblocks(text, file = 'source.ts') {
  const before = docblocks(text, file);
  const titles = before.map((range) => {
    const first = commentLines(text.slice(range.pos, range.end))[0]?.trimEnd();
    return first && TITLE.test(first) ? first : undefined;
  });
  let prepared = text;
  for (let index = before.length - 1; index >= 0; index -= 1) {
    if (!titles[index]) continue;
    const range = before[index];
    const block = text.slice(range.pos, range.end);
    const lines = commentLines(block);
    lines.shift();
    while (lines.length && !lines[0].trim()) lines.shift();
    // A title-only block must stay nonempty for native formatting to retain it.
    if (!lines.length) continue;
    prepared =
      prepared.slice(0, range.pos) + renderComment(block, lines) + prepared.slice(range.end);
  }
  const preparedBlocks = docblocks(prepared, file);
  const result = await format(file, prepared, profile);
  if (result.errors.length)
    throw new Error('Oxfmt failed for ' + file + ': ' + JSON.stringify(result.errors));
  const after = docblocks(result.code, file);
  if (before.length !== after.length)
    throw new Error('JSDoc count changed in ' + file + '; refusing to rewrite.');
  let updated = text;
  for (let index = before.length - 1; index >= 0; index -= 1) {
    const original = before[index];
    const replacement = after[index];
    const leading = text.slice(text.lastIndexOf('\n', original.pos - 1) + 1, original.pos);
    const indentation = /^[ \t]*$/.test(leading) ? leading + ' ' : undefined;
    // Native Markdown formatting can rewrite fenced code, including its closing marker.
    // Preserve these authored examples and only normalize their surrounding tag groups.
    const originalBlock = text.slice(original.pos, original.end);
    if (titles[index] && commentLines(originalBlock).length === 1) {
      updated =
        updated.slice(0, original.pos) +
        renderComment(originalBlock, [titles[index]], indentation) +
        updated.slice(original.end);
      continue;
    }
    const containsExample = commentLines(originalBlock).some((line) =>
      /^[ \t]*(\u0060{3,}|~{3,})/.test(line),
    );
    const preparedBlock = preparedBlocks[index];
    const preparedComment = prepared.slice(preparedBlock.pos, preparedBlock.end);
    const nativeComment = result.code.slice(replacement.pos, replacement.end);
    const expectedTags = tagNames(preparedComment, titles[index]);
    const formattedTags = tagNames(nativeComment, titles[index]);
    const losesTag = [...expectedTags].some((name) => !formattedTags.has(name));
    const block = containsExample || losesTag ? preparedComment : nativeComment;
    updated =
      updated.slice(0, original.pos) +
      structureComment(block, titles[index], indentation) +
      updated.slice(original.end);
  }
  return updated;
}

/** Reuse the existing declaration contract without unrelated presentation diagnostics. */
export function declarationFindings(file, text) {
  const findings = inspectSource(file, text).filter((finding) =>
    finding.rule.startsWith('docblock-'),
  );
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const visit = (node) => {
    const documented = node.jsDoc?.at(-1);
    const classMember =
      node.parent && (ts.isClassDeclaration(node.parent) || ts.isClassExpression(node.parent));
    const namedTypeMember =
      node.parent &&
      (ts.isInterfaceDeclaration(node.parent) ||
        (ts.isTypeLiteralNode(node.parent) && ts.isTypeAliasDeclaration(node.parent.parent)));
    let kinds;
    let name = node.name && ts.isIdentifier(node.name) ? node.name.text : undefined;
    if (ts.isClassDeclaration(node))
      kinds = ['Class', 'Component', 'Directive', 'Service', 'Strategy'];
    else if (ts.isInterfaceDeclaration(node)) kinds = ['Interface'];
    else if (ts.isTypeAliasDeclaration(node)) kinds = ['Type'];
    else if (ts.isFunctionDeclaration(node) && ts.isSourceFile(node.parent)) kinds = ['Function'];
    else if (
      (ts.isMethodDeclaration(node) && classMember) ||
      (ts.isMethodSignature(node) && namedTypeMember)
    )
      kinds = ['Method'];
    else if (
      (ts.isPropertyDeclaration(node) && classMember) ||
      (ts.isPropertySignature(node) && namedTypeMember)
    )
      kinds = ['Property'];
    else if (ts.isConstructorDeclaration(node)) kinds = ['Constructor'];
    else if (ts.isVariableStatement(node) && ts.isSourceFile(node.parent)) {
      kinds = ['Constant', 'Configuration'];
      const declaration = node.declarationList.declarations[0];
      if (declaration && ts.isIdentifier(declaration.name)) name = declaration.name.text;
      if (
        declaration?.initializer &&
        (ts.isArrowFunction(declaration.initializer) ||
          ts.isFunctionExpression(declaration.initializer))
      )
        kinds.unshift('Function');
    }
    if (kinds && (name || kinds[0] === 'Constructor')) {
      const expected = kinds.map((kind) => (kind === 'Constructor' ? kind : kind + ' ' + name));
      if (!documented)
        findings.push({
          file,
          line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1,
          rule: 'docblock-missing',
          message: 'Add a docblock for ' + expected[0] + '.',
        });
      else if (!expected.includes(commentLines(documented.getText(source))[0]))
        findings.push({
          file,
          line: source.getLineAndCharacterOfPosition(documented.pos).line + 1,
          rule: 'docblock-heading',
          message: 'Use the declaration title ' + expected.join(' or ') + '.',
        });
    }
    if (
      kinds &&
      (ts.isFunctionDeclaration(node) ||
        ts.isMethodDeclaration(node) ||
        ts.isConstructorDeclaration(node))
    ) {
      const expected = new Set(
        node.parameters
          .filter((param) => ts.isIdentifier(param.name))
          .map((param) => param.name.text),
      );
      const documentedParameters = new Set();
      for (const tag of ts.getJSDocTags(node).filter(ts.isJSDocParameterTag)) {
        const parameterName = tag.name.getText(source);
        if (
          (ts.isIdentifier(tag.name) && !expected.has(parameterName)) ||
          documentedParameters.has(parameterName)
        )
          findings.push({
            file,
            line: source.getLineAndCharacterOfPosition(tag.pos).line + 1,
            rule: 'docblock-param',
            message: `Unknown or duplicate @param ${parameterName}.`,
          });
        documentedParameters.add(parameterName);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return findings;
}

/** Restrict comment maintenance to real authored source files in this checkout. */
export function assignedFile(file, directory = root) {
  const absolute = path.resolve(directory, file);
  const relative = path.relative(directory, absolute).replaceAll('\\', '/');
  if (
    !relative.startsWith('src/app/') ||
    relative.startsWith('src/app/shared/ui/') ||
    !relative.endsWith('.ts') ||
    relative.endsWith('.spec.ts') ||
    relative.endsWith('.d.ts') ||
    relative.includes('../')
  )
    throw new Error(`Outside authored documentation scope: ${file}`);
  if (!existsSync(absolute)) throw new Error(`Missing assigned file: ${file}`);
  const actual = path.relative(realpathSync(directory), realpathSync(absolute));
  if (actual.replaceAll('\\', '/').toLowerCase() !== relative.toLowerCase())
    throw new Error(`Symlink outside assigned source: ${file}`);
  return relative;
}

/** Select tracked changes plus new files; invalid base revisions fail visibly. */
export function changedFiles(base = 'HEAD', directory = root) {
  const git = (args) =>
    execFileSync('git', args, { cwd: directory, encoding: 'utf8', stdio: 'pipe' });
  const revision = /^0+$/.test(base)
    ? null
    : git(['rev-parse', '--verify', '--end-of-options', `${base}^{commit}`]).trim();
  const tracked =
    revision === null
      ? git(['ls-files', '-z', '--', 'src/app'])
      : git(['diff', '--name-only', '--diff-filter=ACMR', '-z', revision, '--', 'src/app']);
  const untracked = git(['ls-files', '--others', '--exclude-standard', '-z', '--', 'src/app']);
  return [...new Set(`${tracked}\0${untracked}`.split('\0').filter(Boolean))].filter(
    (file) =>
      file.endsWith('.ts') &&
      !file.endsWith('.spec.ts') &&
      !file.endsWith('.d.ts') &&
      !file.startsWith('src/app/shared/ui/') &&
      existsSync(path.join(directory, file)),
  );
}

async function main(args) {
  let fix = false;
  let base = process.env.DOC_BASE || 'HEAD';
  const files = [];
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--fix') fix = true;
    else if (args[index] === '--base' && args[index + 1]) base = args[++index];
    else if (args[index].startsWith('-')) throw new Error(`Unknown option: ${args[index]}`);
    else files.push(args[index]);
  }
  if (fix && !files.length) throw new Error('--fix requires explicit assigned files.');
  const selected = [
    ...new Set((files.length ? files : changedFiles(base)).map((file) => assignedFile(file))),
  ];
  let failed = false;
  const prepared = await Promise.all(
    selected.map(async (file) => {
      const absolute = path.join(root, file);
      const text = readFileSync(absolute, 'utf8');
      return { file, absolute, text, formatted: await formatDocblocks(text, file) };
    }),
  );
  for (const { file, absolute, text, formatted } of prepared) {
    if (formatted !== text) {
      if (fix) writeFileSync(absolute, formatted);
      else {
        process.stderr.write(`${file}: JSDoc formatting differs; run docs:fix with this file.\n`);
        failed = true;
      }
    }
    for (const finding of declarationFindings(file, fix ? formatted : text)) {
      process.stderr.write(`${file}:${finding.line} ${finding.message}\n`);
      failed = true;
    }
  }
  // No paths means Oxlint would scan the whole repository; skip an empty selection.
  for (let offset = 0; offset < selected.length; offset += 50) {
    const lint = spawnSync(
      process.execPath,
      [
        path.join(root, 'node_modules/oxlint/bin/oxlint'),
        '-c',
        '.oxlintrc.comments.json',
        ...selected.slice(offset, offset + 50),
      ],
      { cwd: root, stdio: 'inherit' },
    );
    if (lint.error) throw lint.error;
    if (lint.status !== 0) failed = true;
  }
  process.stdout.write(
    `Documentation: ${selected.length} authored file(s), ${failed ? 'FAIL' : 'PASS'}.\n`,
  );
  process.exitCode = failed ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 2;
  });
}
