import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { publicEntries } from './feature-contracts';

export type Rule = 'core-independence' | 'shared-ports' | 'feature-public-api' | 'resolved-imports';
export interface Dependency {
  source: string;
  target: string;
  specifier: string;
  dynamic: boolean;
  runtime: boolean;
  line: number;
}
export interface Violation {
  rule: Rule;
  source: string;
  target: string;
  specifier: string;
  line: number;
}
export interface Analysis {
  dependencies: Dependency[];
  violations: Violation[];
}

const normalize = (value: string): string => value.replaceAll('\\', '/');
const within = (directory: string, file: string): boolean => {
  const local = path.relative(directory, file);
  return (
    local === '' ||
    (!local.startsWith('..' + path.sep) && local !== '..' && !path.isAbsolute(local))
  );
};

/** Resolve imports with the project's compiler settings, without executing application code. */
export function analyzeBoundaries(root: string): Analysis {
  const app = path.resolve(root, 'src/app');
  const configPath = path.resolve(root, 'tsconfig.json');
  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  if (config.error)
    throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, '\n'));
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root, undefined, configPath);
  const configErrors = parsed.errors.filter((error) => error.code !== 18003);
  if (configErrors.length) {
    throw new Error(
      configErrors
        .map((error) => ts.flattenDiagnosticMessageText(error.messageText, '\n'))
        .join('\n'),
    );
  }
  const options = parsed.options;
  const cache = ts.createModuleResolutionCache(root, (file) => file, options);
  const relative = (file: string): string => normalize(path.relative(root, file));
  const contracts = new Map<string, string>();
  const owners = new Map<string, string | null>();
  const dependencies: Dependency[] = [];
  const violations: Violation[] = [];

  function owner(file: string): string | null {
    if (owners.has(file)) return owners.get(file) ?? null;
    let directory = path.dirname(file);
    while (within(app, directory)) {
      const contract = path.join(directory, 'FEATURE.md');
      if (existsSync(contract)) {
        if (!contracts.has(directory)) contracts.set(directory, readFileSync(contract, 'utf8'));
        owners.set(file, directory);
        return directory;
      }
      if (directory === app) break;
      directory = path.dirname(directory);
    }
    owners.set(file, null);
    return null;
  }

  function published(
    target: string,
    targetOwner: string,
    sourceOwner: string | null,
    sourcePath: string,
  ): boolean {
    const local = normalize(path.relative(targetOwner, target));
    if (local === 'index.ts') return true;
    if (
      /^(?:ports|setup|navigation|data-access|services|access|models|state|utils|constants|options|providers|http\/(?:guards|resolvers|interceptors)|ui\/(?:components|tables|dataviews|forms|dialogs|sheets))\/index\.ts$/.test(
        local,
      )
    )
      return true;
    if (/^ports\/[^/]+\/index\.ts$/.test(local)) return true;
    // A local barrel does not become public just by being named index.ts.
    if (
      !local.endsWith('/index.ts') ||
      /^(?:data-access\/(?:services|adapters)|ui\/pages)\//.test(local)
    )
      return false;
    const entry = local.slice(0, -'/index.ts'.length);
    const alias =
      '@features/' + relative(targetOwner).slice('src/app/features/'.length) + '/' + entry;
    const consumer = sourceOwner
      ? relative(sourceOwner).slice('src/app/features/'.length)
      : sourcePath.startsWith('src/app/layouts/')
        ? 'layouts/' + sourcePath.slice('src/app/layouts/'.length).split('/')[0]
        : 'app';
    return publicEntries(contracts.get(targetOwner) ?? '').some(
      (row) =>
        (row.entry === entry || row.entry === alias) &&
        (sourceOwner === targetOwner || row.consumers.includes(consumer)),
    );
  }

  function visitFile(file: string): void {
    const sourcePath = relative(file);
    const sourceOwner = owner(file);
    const source = ts.createSourceFile(
      file,
      readFileSync(file, 'utf8'),
      ts.ScriptTarget.Latest,
      true,
    );
    // TypeScript erases imports used only in type positions and unused bindings.
    // Build the execution graph from emitted syntax, without running application code.
    const runtimeImports = new Set<string>();
    const emitted = ts.transpileModule(source.text, { compilerOptions: options }).outputText;
    const runtimeSource = ts.createSourceFile(file + '.js', emitted, ts.ScriptTarget.Latest, true);
    for (const statement of runtimeSource.statements) {
      if (
        (ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement)) &&
        statement.moduleSpecifier &&
        ts.isStringLiteralLike(statement.moduleSpecifier)
      )
        runtimeImports.add(statement.moduleSpecifier.text);
      if (
        ts.isImportEqualsDeclaration(statement) &&
        ts.isExternalModuleReference(statement.moduleReference) &&
        statement.moduleReference.expression &&
        ts.isStringLiteralLike(statement.moduleReference.expression)
      )
        runtimeImports.add(statement.moduleReference.expression.text);
    }
    const visit = (node: ts.Node): void => {
      let literal: ts.StringLiteralLike | undefined;
      let dynamic = false;
      if (
        (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
        node.moduleSpecifier &&
        ts.isStringLiteralLike(node.moduleSpecifier)
      ) {
        literal = node.moduleSpecifier;
      } else if (
        ts.isCallExpression(node) &&
        node.expression.kind === ts.SyntaxKind.ImportKeyword &&
        node.arguments[0] &&
        ts.isStringLiteralLike(node.arguments[0])
      ) {
        literal = node.arguments[0];
        dynamic = true;
      } else if (
        ts.isImportTypeNode(node) &&
        ts.isLiteralTypeNode(node.argument) &&
        ts.isStringLiteralLike(node.argument.literal)
      ) {
        literal = node.argument.literal;
      } else if (
        ts.isImportEqualsDeclaration(node) &&
        ts.isExternalModuleReference(node.moduleReference) &&
        node.moduleReference.expression &&
        ts.isStringLiteralLike(node.moduleReference.expression)
      ) {
        literal = node.moduleReference.expression;
      }
      if (literal) {
        const specifier = literal.text;
        const alias = Object.keys(options.paths ?? {})
          .toSorted((left, right) => {
            if (left === specifier) return -1;
            if (right === specifier) return 1;
            return right.indexOf('*') - left.indexOf('*');
          })
          .find((pattern) => {
            const star = pattern.indexOf('*');
            return star < 0
              ? pattern === specifier
              : specifier.startsWith(pattern.slice(0, star)) &&
                  specifier.endsWith(pattern.slice(star + 1));
          });
        if (specifier.startsWith('.') || alias) {
          const result = ts.resolveModuleName(
            specifier,
            file,
            options,
            ts.sys,
            cache,
          ).resolvedModule;
          const line = source.getLineAndCharacterOfPosition(literal.getStart(source)).line + 1;
          if (result && within(app, result.resolvedFileName)) {
            const targetFile = path.resolve(result.resolvedFileName);
            const target = relative(targetFile);
            const edge = {
              source: sourcePath,
              target,
              specifier,
              dynamic,
              runtime: !dynamic && runtimeImports.has(specifier),
              line,
            };
            dependencies.push(edge);
            const targetOwner = owner(targetFile);
            const featureTarget = target.startsWith('src/app/features/');
            let rule: Rule | undefined;
            if (
              sourcePath.startsWith('src/app/core/') &&
              (featureTarget || target.startsWith('src/app/layouts/'))
            ) {
              rule = 'core-independence';
            } else if (sourcePath.startsWith('src/app/shared/') && featureTarget) {
              const local = targetOwner ? normalize(path.relative(targetOwner, targetFile)) : '';
              if (!/^ports\/(?:[^/]+\/)?index\.ts$/.test(local)) rule = 'shared-ports';
            } else if (featureTarget && sourceOwner !== targetOwner) {
              const lazyRoute =
                dynamic &&
                sourcePath.endsWith('.routes.ts') &&
                targetOwner &&
                ((path.dirname(targetFile) === targetOwner && target.endsWith('.routes.ts')) ||
                  /^ui\/pages\/[^/]+\/[^/]+\.component\.ts$/.test(
                    normalize(path.relative(targetOwner, targetFile)),
                  ));
              if (
                !lazyRoute &&
                (!targetOwner || !published(targetFile, targetOwner, sourceOwner, sourcePath))
              )
                rule = 'feature-public-api';
            }
            if (rule) violations.push({ ...edge, rule });
          } else if (!result) {
            const pathsBase =
              typeof options['pathsBasePath'] === 'string' ? options['pathsBasePath'] : root;
            const wildcard = alias?.indexOf('*') ?? -1;
            const substitution =
              alias && wildcard >= 0
                ? specifier.slice(wildcard, specifier.length - alias.slice(wildcard + 1).length)
                : '';
            const candidates = alias
              ? (options.paths?.[alias] ?? []).map((mapping) =>
                  path.resolve(options.baseUrl ?? pathsBase, mapping.replace('*', substitution)),
                )
              : [path.resolve(path.dirname(file), specifier)];
            if (candidates.some((candidate) => within(app, candidate))) {
              violations.push({
                rule: 'resolved-imports',
                source: sourcePath,
                target: specifier,
                specifier,
                line,
              });
            }
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }

  function walk(directory: string): void {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory() && entry.name !== 'testing') walk(file);
      if (
        entry.isFile() &&
        entry.name.endsWith('.ts') &&
        !/\.(?:spec|test|d)\.ts$/.test(entry.name)
      )
        visitFile(file);
    }
  }
  walk(app);
  return { dependencies, violations };
}

export function describeViolation(violation: Violation): string {
  return (
    violation.source +
    ':' +
    violation.line +
    ' -> ' +
    violation.target +
    ' (' +
    violation.rule +
    ')'
  );
}
