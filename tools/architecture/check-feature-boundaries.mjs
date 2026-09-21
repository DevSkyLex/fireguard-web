import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const APP = path.join(ROOT, 'src/app');
const BASELINE = path.join(ROOT, 'tools/architecture/feature-boundaries.baseline.json');
const normalize = (value) => value.replaceAll('\\', '/');
const relative = (value) => normalize(path.relative(ROOT, value));

/** Resolve local aliases without loading environment files or dependency trees. */
function resolveImport(source, specifier) {
  const aliases = {
    '@features/': 'features/',
    '@core/': 'core/',
    '@shared/': 'shared/',
    '@layouts/': 'layouts/',
    '@app/': '',
  };
  let target = specifier.startsWith('.') ? path.resolve(path.dirname(source), specifier) : null;
  for (const [alias, directory] of Object.entries(aliases)) {
    if (specifier.startsWith(alias))
      target = path.join(APP, directory, specifier.slice(alias.length));
  }
  if (!target || !normalize(target).startsWith(normalize(APP) + '/')) return null;
  return (
    [target + '.ts', path.join(target, 'index.ts')].find((candidate) => fs.existsSync(candidate)) ??
    null
  );
}

/** The nearest FEATURE.md owns a business file, including nested subfeatures. */
function owner(file) {
  let directory = path.dirname(file);
  while (directory.startsWith(APP)) {
    if (fs.existsSync(path.join(directory, 'FEATURE.md'))) return relative(directory);
    if (directory === APP) break;
    directory = path.dirname(directory);
  }
  return relative(file).split('/').slice(0, 3).join('/');
}

/** Inspect static imports/re-exports and literal dynamic imports, not textual regex matches. */
function dependencies(file) {
  const source = ts.createSourceFile(
    file,
    fs.readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
  );
  const results = [];
  const visit = (node) => {
    let specifier = null;
    let dynamic = false;
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      specifier = node.moduleSpecifier.text;
    } else if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length === 1 &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      specifier = node.arguments[0].text;
      dynamic = true;
    }
    if (specifier !== null) results.push({ specifier, dynamic });
    ts.forEachChild(node, visit);
  };
  visit(source);
  return results;
}

/** Traverse authored application files; tests may exercise owner-private seams. */
function files(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return entry.name === 'testing' ? [] : files(file);
    return entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts') ? [file] : [];
  });
}

const violations = new Set();
let inspected = 0;
for (const file of files(APP)) {
  const source = relative(file);
  const sourceOwner = owner(file);
  for (const { specifier, dynamic } of dependencies(file)) {
    const targetFile = resolveImport(file, specifier);
    if (!targetFile) continue;
    inspected++;
    const target = relative(targetFile);
    const targetOwner = owner(targetFile);
    const featureTarget = target.startsWith('src/app/features/');
    let reason = null;
    if (
      source.startsWith('src/app/core/') &&
      (featureTarget || target.startsWith('src/app/layouts/'))
    ) {
      reason = 'core depends on business or layout';
    } else if (
      source.startsWith('src/app/shared/') &&
      featureTarget &&
      !(target.includes('/ports/') && target.endsWith('/index.ts'))
    ) {
      reason = 'shared depends on a feature outside its published ports';
    } else if (featureTarget && sourceOwner !== targetOwner && !target.endsWith('/index.ts')) {
      const routeEntry =
        dynamic && (source.endsWith('.routes.ts') || source.endsWith('/app.routes.ts'));
      if (!routeEntry) reason = 'cross-feature private import';
    }
    if (reason) violations.add(`${source} -> ${target} (${reason})`);
  }
}
const actual = [...violations].toSorted();
if (process.argv.includes('--capture-baseline')) {
  fs.writeFileSync(
    BASELINE,
    JSON.stringify({ captured: '2026-09-21', exceptions: actual }, null, 2) + '\n',
  );
  process.stdout.write(`Captured ${actual.length} existing exact import exceptions.\n`);
} else {
  const baseline = JSON.parse(fs.readFileSync(BASELINE, 'utf8')).exceptions;
  const allowed = new Set(baseline);
  const regressions = actual.filter((entry) => !allowed.has(entry));
  const stale = baseline.filter((entry) => !violations.has(entry));
  for (const entry of regressions) process.stderr.write(`New private dependency: ${entry}\n`);
  for (const entry of stale) process.stderr.write(`Remove repaired baseline entry: ${entry}\n`);
  process.stdout.write(
    `Checked ${inspected} local imports; ${actual.length} exact legacy exceptions; ${regressions.length} regressions.\n`,
  );
  if (regressions.length || stale.length) process.exitCode = 1;
}
