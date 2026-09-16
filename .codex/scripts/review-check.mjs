import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseTemplate } from '@angular/compiler';
import ts from 'typescript';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/** Return explicit Angular custom translation identifiers and their first source line. */
export function customTranslationIds(text) {
  const ids = new Map();
  const pattern = /@@([A-Za-z0-9][A-Za-z0-9_.-]*)/g;
  for (const match of text.matchAll(pattern)) {
    if (!ids.has(match[1])) ids.set(match[1], text.slice(0, match.index).split('\n').length);
  }
  return ids;
}

/** Return translation identifiers declared by an XLIFF 1.2 or 2.0 catalog. */
export function catalogTranslationIds(text) {
  const ids = new Set();
  const pattern = /<(?:trans-unit|unit)\b[^>]*\bid=(['"])(.*?)\1/gi;
  for (const match of text.matchAll(pattern)) ids.add(match[2]);
  return ids;
}

/** Report newly authored source messages missing from a required locale catalog. */
export function missingTranslationFindings(sourceIds, catalogs) {
  const findings = [];
  for (const [id, location] of sourceIds) {
    const missingLocales = Object.entries(catalogs)
      .filter(([, ids]) => !ids.has(id))
      .map(([locale]) => locale);
    if (!missingLocales.length) continue;
    findings.push({
      file: location.file,
      line: location.line,
      rule: 'translation-catalog',
      severity: 'error',
      message: `New translation @@${id} is missing from: ${missingLocales.join(', ')}.`,
    });
  }
  return findings;
}

/** Extract added/changed line ranges; deletions alone introduce no declarations. */
export function changedRanges(patch) {
  const files = new Map();
  let ranges;
  for (const line of patch.split('\n')) {
    if (line.startsWith('+++ b/')) {
      ranges = [];
      files.set(line.slice(6).replace(/\r$/, ''), ranges);
    }
    const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/.exec(line);
    if (ranges && hunk) {
      const count = Number(hunk[2] ?? 1);
      if (count) ranges.push([Number(hunk[1]), Number(hunk[1]) + count - 1]);
    }
  }
  return files;
}

/** Inspect authored source, reporting only declarations intersecting changed lines. */
export function inspectSource(file, text, ranges = [[1, Infinity]]) {
  const findings = [];
  const lineAt = (offset) => text.slice(0, offset).split('\n').length;
  const touched = (start, end = start) =>
    ranges.some(([first, last]) => first <= end && last >= start);
  const report = (rule, message, start, end = start, severity = 'error') => {
    if (touched(start, end)) findings.push({ file, line: start, rule, severity, message });
  };
  if (file.endsWith('.html')) {
    const template = parseTemplate(text, file);
    const seen = new WeakSet();
    const visit = (node) => {
      if (!node || typeof node !== 'object' || seen.has(node)) return;
      seen.add(node);
      if (node.name === 'hlm-drawer') {
        const invalid = [...(node.attributes ?? []), ...(node.inputs ?? [])].find(
          (attr) => attr.name === 'side',
        );
        if (invalid)
          report(
            'drawer-direction',
            'HlmDrawer takes direction, not side.',
            invalid.sourceSpan.start.line + 1,
          );
      }
      const drawerClose = node.attributes?.find((attr) => attr.name === 'hlmDrawerClose');
      if (drawerClose && node.name !== 'button') {
        report(
          'drawer-close-target',
          'The installed hlmDrawerClose directive only matches buttons; explicitly close from navigation links.',
          drawerClose.sourceSpan.start.line + 1,
        );
      }
      if (
        drawerClose &&
        node.outputs?.some((event) => event.name === 'click' || event.name === 'selected')
      ) {
        report(
          'drawer-command-close',
          'Commit the command before explicit close; use hlmDrawerClose only for dismissal.',
          node.sourceSpan.start.line + 1,
          node.startSourceSpan?.end.line + 1,
          'warning',
        );
      }
      if (
        node.constructor.name === 'PropertyRead' &&
        node.name === '$any' &&
        node.receiver?.constructor.name === 'ImplicitReceiver'
      ) {
        report(
          'template-any',
          'Narrow unknown library outputs at the application boundary instead of using $any.',
          lineAt(node.nameSpan.start),
        );
      }
      for (const value of Object.values(node)) {
        if (Array.isArray(value)) value.forEach(visit);
        else if (value && typeof value === 'object') visit(value);
      }
    };
    template.nodes.forEach(visit);
    return findings;
  }
  if (!file.endsWith('.ts') || file.endsWith('.spec.ts') || file.endsWith('.d.ts')) return findings;
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const accessOf = (node) =>
    node.modifiers
      ?.find((modifier) =>
        [
          ts.SyntaxKind.PublicKeyword,
          ts.SyntaxKind.ProtectedKeyword,
          ts.SyntaxKind.PrivateKeyword,
        ].includes(modifier.kind),
      )
      ?.getText(source);
  const checkDeclaration = (node, kind, isMember = false) => {
    const start = lineAt(node.getStart(source));
    const end = lineAt(ts.isClassDeclaration(node) ? node.members.pos : node.end);
    if (!touched(start, end)) return;
    const tags = ts.getJSDocTags(node);
    const names = new Set(tags.map((tag) => tag.tagName.text));
    const required = ['description'];
    if (isMember) {
      required.push('access', 'since');
      if (!accessOf(node))
        report('explicit-access', 'Declare the member access level.', start, end);
    }
    if (ts.isPropertyDeclaration(node)) {
      required.push('type');
      if (!node.type) report('explicit-type', 'Declare the property type.', start, end);
      if (node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ReadonlyKeyword))
        required.push('readonly');
    } else if (ts.isMethodDeclaration(node) || ts.isFunctionDeclaration(node)) {
      required.push('returns');
      if (!node.type) report('explicit-return', 'Declare the return type.', start, end);
      const documented = new Set(
        tags.filter(ts.isJSDocParameterTag).map((tag) => tag.name.getText(source)),
      );
      for (const parameter of node.parameters) {
        if (ts.isIdentifier(parameter.name) && !documented.has(parameter.name.text))
          report('docblock-param', `Document parameter ${parameter.name.text}.`, start, end);
      }
    } else if (ts.isConstructorDeclaration(node)) required.push('constructor');
    else if (ts.isInterfaceDeclaration(node)) required.push('interface');
    else if (ts.isTypeAliasDeclaration(node)) required.push('type');
    for (const tag of required) {
      if (!names.has(tag)) report('docblock-tag', `${kind} requires @${tag}.`, start, end);
    }
    const accessTag = tags.find((tag) => tag.tagName.text === 'access');
    if (
      isMember &&
      accessTag &&
      typeof accessTag.comment === 'string' &&
      accessOf(node) &&
      accessTag.comment.trim() !== accessOf(node)
    )
      report('docblock-access', 'Docblock access must match the declaration.', start, end);
  };
  const typeOnlyModel =
    file.includes('/models/') && !/\/models\/[^/]+-tag\//.test(file) && !file.endsWith('.model.ts');
  for (const statement of source.statements) {
    if (
      typeOnlyModel &&
      (ts.isFunctionDeclaration(statement) ||
        ts.isClassDeclaration(statement) ||
        ts.isVariableStatement(statement) ||
        ts.isEnumDeclaration(statement))
    ) {
      report(
        'model-runtime',
        'Runtime declarations belong outside a type-only models folder.',
        lineAt(statement.getStart(source)),
        lineAt(statement.end),
      );
    }
    if (ts.isInterfaceDeclaration(statement)) checkDeclaration(statement, 'Interface');
    if (ts.isTypeAliasDeclaration(statement)) checkDeclaration(statement, 'Type');
    if (ts.isFunctionDeclaration(statement)) checkDeclaration(statement, 'Function');
    if (!ts.isClassDeclaration(statement)) continue;
    checkDeclaration(statement, 'Class');
    for (const member of statement.members) {
      if (ts.isPropertyDeclaration(member)) checkDeclaration(member, 'Property', true);
      if (ts.isMethodDeclaration(member)) checkDeclaration(member, 'Method', true);
      if (ts.isConstructorDeclaration(member)) checkDeclaration(member, 'Constructor', true);
    }
  }
  return findings;
}

/** Run the explicit review gate against a commit plus unstaged/staged and untracked source. */
export function reviewDiff(base = 'develop', directory = root) {
  const git = (args) =>
    execFileSync('git', ['-c', 'core.quotepath=false', ...args], {
      cwd: directory,
      encoding: 'utf8',
      windowsHide: true,
      maxBuffer: 16 * 1024 * 1024,
    });
  const revision = git(['rev-parse', '--verify', `${base}^{commit}`]).trim();
  const files = changedRanges(
    git(['diff', '--no-ext-diff', '--unified=0', revision, '--', 'src/app', 'src/index.html']),
  );
  for (const file of git([
    'ls-files',
    '--others',
    '--exclude-standard',
    '-z',
    '--',
    'src/app',
    'src/index.html',
  ])
    .split('\0')
    .filter(Boolean))
    files.set(file, [[1, Infinity]]);
  const findings = [];
  let baseTranslationOutput = '';
  try {
    baseTranslationOutput = git([
      'grep',
      '-h',
      '-o',
      '-I',
      '-E',
      '@@[A-Za-z0-9][A-Za-z0-9_.-]*',
      revision,
      '--',
      'src/app',
      'src/index.html',
    ]);
  } catch (error) {
    if (error.status !== 1) throw error;
  }
  const baseTranslationIds = new Set(
    baseTranslationOutput
      .split(/\r?\n/)
      .filter(Boolean)
      .map((id) => id.slice(2)),
  );
  const newTranslationIds = new Map();
  for (const [file, ranges] of files) {
    const absoluteFile = path.join(directory, file);
    if (!existsSync(absoluteFile)) continue;
    const text = readFileSync(absoluteFile, 'utf8');
    if (file.endsWith('.ts') || file.endsWith('.html')) {
      for (const [id, line] of customTranslationIds(text)) {
        if (!baseTranslationIds.has(id) && !newTranslationIds.has(id)) {
          newTranslationIds.set(id, { file, line });
        }
      }
    }
    if (file.startsWith('src/app/shared/ui/')) continue;
    findings.push(...inspectSource(file, text, ranges));
  }
  findings.push(
    ...missingTranslationFindings(newTranslationIds, {
      fr: catalogTranslationIds(
        readFileSync(path.join(directory, 'src/locale/messages.fr.xlf'), 'utf8'),
      ),
      es: catalogTranslationIds(
        readFileSync(path.join(directory, 'src/locale/messages.es.xlf'), 'utf8'),
      ),
    }),
  );
  return {
    base: revision,
    findings: findings.toSorted(
      (a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.rule.localeCompare(b.rule),
    ),
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    let base = 'develop';
    let json = false;
    for (let index = 0; index < args.length; index += 1) {
      if (args[index] === '--json') json = true;
      else if (args[index] === '--base' && args[index + 1]) base = args[++index];
      else throw new Error(`Unknown or incomplete option: ${args[index]}`);
    }
    const result = reviewDiff(base);
    process.stdout.write(
      json
        ? `${JSON.stringify(result, null, 2)}\n`
        : result.findings
            .map(
              (finding) =>
                `${finding.file}:${finding.line} ${finding.severity} ${finding.rule}: ${finding.message}`,
            )
            .join('\n') + '\n',
    );
    process.exitCode = result.findings.some((finding) => finding.severity === 'error') ? 1 : 0;
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 2;
  }
}
