import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import type { Dependency } from './boundaries';
import { publicEntries } from './feature-contracts';

export interface StructureViolation {
  rule:
    | 'explicit-exports'
    | 'private-exports'
    | 'layout-ports'
    | 'presentation'
    | 'feature-contracts';
  source: string;
  line: number;
  detail: string;
}

function recorded(values: Map<string, number>, node: string): number {
  const value = values.get(node);
  if (value === undefined) throw new Error('Missing cycle traversal index: ' + node);
  return value;
}

/** Check ownership, public exports and orchestration without importing Angular. */
export function analyzeStructure(root: string, dependencies: Dependency[]): StructureViolation[] {
  const app = path.join(root, 'src/app');
  const violations: StructureViolation[] = [];
  const sources = new Map<string, ts.SourceFile>();
  const relative = (file: string): string => path.relative(root, file).replaceAll('\\', '/');
  const edges = new Map(
    dependencies.map((edge) => [edge.source + '\0' + edge.specifier, edge.target]),
  );
  function walk(directory: string): void {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory() && entry.name !== 'testing' && relative(file) !== 'src/app/shared/ui')
        walk(file);
      else if (
        entry.isFile() &&
        entry.name.endsWith('.ts') &&
        !/\.(?:spec|test|d)\.ts$/.test(entry.name)
      ) {
        sources.set(
          relative(file),
          ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true),
        );
      }
      if (entry.isFile() && entry.name === 'FEATURE.md') {
        const text = readFileSync(file, 'utf8');
        for (const row of publicEntries(text)) {
          const entryPath = row.entry.startsWith('@features/')
            ? path.join(app, 'features', row.entry.slice('@features/'.length))
            : path.resolve(directory, row.entry);
          const local = path.relative(directory, entryPath);
          if (
            local.startsWith('..') ||
            path.isAbsolute(local) ||
            !existsSync(path.join(entryPath, 'index.ts')) ||
            !row.consumers.length ||
            row.consumers.some(
              (consumer) =>
                consumer !== 'app' &&
                !existsSync(path.join(app, 'features', consumer, 'FEATURE.md')),
            )
          ) {
            violations.push({
              rule: 'feature-contracts',
              source: relative(file),
              line: row.line,
              detail:
                'Public entry must exist within its owner and name existing consumer contracts: ' +
                row.entry,
            });
          }
        }
      }
    }
    if (
      path.basename(path.dirname(directory)) === 'features' &&
      !existsSync(path.join(directory, 'FEATURE.md')) &&
      [...sources.keys()].some((file) => file.startsWith(relative(directory) + '/'))
    ) {
      violations.push({
        rule: 'feature-contracts',
        source: relative(directory) + '/FEATURE.md',
        line: 1,
        detail: 'Business feature has no ownership contract.',
      });
    }
  }
  walk(app);

  function origins(file: string, name: string, visited = new Set<string>()): string[] {
    const key = file + '\0' + name;
    if (visited.has(key)) return [];
    const next = new Set(visited).add(key);
    const source = sources.get(file);
    if (!source) return [file];
    const result: string[] = [];
    for (const statement of source.statements) {
      if (
        ts.isExportDeclaration(statement) &&
        !statement.moduleSpecifier &&
        statement.exportClause &&
        ts.isNamedExports(statement.exportClause)
      ) {
        for (const item of statement.exportClause.elements) {
          if (item.name.text !== name && name !== '*') continue;
          const localName = item.propertyName?.text ?? item.name.text;
          for (const declaration of source.statements) {
            if (
              !ts.isImportDeclaration(declaration) ||
              !declaration.moduleSpecifier ||
              !ts.isStringLiteralLike(declaration.moduleSpecifier)
            )
              continue;
            const imported = edges.get(file + '\0' + declaration.moduleSpecifier.text);
            const bindings = declaration.importClause?.namedBindings;
            if (!imported) continue;
            if (declaration.importClause?.name?.text === localName)
              result.push(...origins(imported, 'default', next));
            if (bindings && ts.isNamespaceImport(bindings) && bindings.name.text === localName)
              result.push(...origins(imported, '*', next));
            if (bindings && ts.isNamedImports(bindings)) {
              const binding = bindings.elements.find((element) => element.name.text === localName);
              if (binding)
                result.push(
                  ...origins(imported, binding.propertyName?.text ?? binding.name.text, next),
                );
            }
          }
        }
      }
      if (
        !ts.isExportDeclaration(statement) ||
        !statement.moduleSpecifier ||
        !ts.isStringLiteralLike(statement.moduleSpecifier)
      )
        continue;
      const target = edges.get(file + '\0' + statement.moduleSpecifier.text);
      if (!target) continue;
      if (!statement.exportClause || ts.isNamespaceExport(statement.exportClause)) {
        result.push(...origins(target, name, next));
      } else {
        for (const item of statement.exportClause.elements) {
          if (item.name.text === name || name === '*')
            result.push(...origins(target, item.propertyName?.text ?? item.name.text, next));
        }
      }
    }
    return result.length ? result : [file];
  }

  for (const [file, source] of sources) {
    const lineOf = (node: ts.Node): number =>
      source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
    const report = (rule: StructureViolation['rule'], node: ts.Node, detail: string): void => {
      violations.push({ rule, source: file, line: lineOf(node), detail });
    };
    const layout = file.startsWith('src/app/layouts/');
    const presentation =
      /\/ui\/(?:dataviews|forms|tables)\/.*\.component\.ts$/.test(file) ||
      source.statements.some((node) =>
        ts.getJSDocTags(node).some((tag) => tag.tagName.text === 'presentation'),
      );
    for (const statement of source.statements) {
      if (path.basename(file) === 'index.ts' && ts.isExportDeclaration(statement)) {
        if (!statement.exportClause || ts.isNamespaceExport(statement.exportClause))
          report('explicit-exports', statement, 'Public barrels require explicit named exports.');
        if (
          !statement.moduleSpecifier &&
          statement.exportClause &&
          ts.isNamedExports(statement.exportClause)
        ) {
          for (const item of statement.exportClause.elements) {
            for (const origin of origins(file, item.name.text)) {
              if (
                /\/(?:testing|private|internal|adapters)\/|\.(?:spec|test)\.ts$/.test(origin) ||
                (origin.includes('/ui/pages/') && !file.includes('/ui/pages/'))
              )
                report(
                  'private-exports',
                  item,
                  'Public symbol exposes private implementation: ' + origin,
                );
            }
          }
        }
        if (statement.moduleSpecifier && ts.isStringLiteralLike(statement.moduleSpecifier)) {
          const target = edges.get(file + '\0' + statement.moduleSpecifier.text);
          if (
            target &&
            (/\/(?:testing|private|internal|adapters)\/|\.(?:spec|test)\.ts$/.test(target) ||
              (target.includes('/ui/pages/') && !file.includes('/ui/pages/')))
          )
            report(
              'private-exports',
              statement,
              'Barrel exposes private implementation: ' + target,
            );
          if (target && statement.exportClause && ts.isNamedExports(statement.exportClause)) {
            const targetSource = sources.get(target);
            for (const item of statement.exportClause.elements) {
              const name = item.propertyName?.text ?? item.name.text;
              for (const origin of origins(target, name)) {
                if (
                  /\/(?:testing|private|internal|adapters)\/|\.(?:spec|test)\.ts$/.test(origin) ||
                  (origin.includes('/ui/pages/') && !file.includes('/ui/pages/'))
                )
                  report(
                    'private-exports',
                    item,
                    'Public symbol exposes private implementation: ' + origin,
                  );
              }
              const declaration = targetSource?.statements.find((node) => {
                if (ts.isVariableStatement(node))
                  return node.declarationList.declarations.some(
                    (decl) => ts.isIdentifier(decl.name) && decl.name.text === name,
                  );
                return (
                  (ts.isClassDeclaration(node) ||
                    ts.isFunctionDeclaration(node) ||
                    ts.isInterfaceDeclaration(node) ||
                    ts.isTypeAliasDeclaration(node) ||
                    ts.isEnumDeclaration(node)) &&
                  node.name?.text === name
                );
              });
              if (
                declaration &&
                ts.getJSDocTags(declaration).some((tag) => tag.tagName.text === 'internal')
              )
                report('private-exports', item, 'Barrel exposes @internal symbol: ' + name);
            }
          }
        }
      }
      if (
        (!layout && !presentation) ||
        !ts.isImportDeclaration(statement) ||
        !statement.moduleSpecifier ||
        !ts.isStringLiteralLike(statement.moduleSpecifier) ||
        statement.importClause?.isTypeOnly
      )
        continue;
      const bindings = statement.importClause?.namedBindings;
      const names =
        bindings && ts.isNamedImports(bindings)
          ? bindings.elements
              .filter((item) => !item.isTypeOnly)
              .map((item) => item.propertyName?.text ?? item.name.text)
          : ['*'];
      const target = edges.get(file + '\0' + statement.moduleSpecifier.text);
      for (const name of names) {
        for (const origin of target ? origins(target, name) : []) {
          if (
            origin.startsWith('src/app/features/') &&
            /\/(?:state|data-access|services|access\/services)\//.test(origin)
          ) {
            // Port tokens/interfaces can depend on their owner's domain types; implementations cannot.
            if (layout)
              report(
                'layout-ports',
                statement,
                'Layout consumes a concrete feature implementation: ' + origin,
              );
            if (presentation && /\/(?:state|data-access)\//.test(origin))
              report(
                'presentation',
                statement,
                'Presentational UI consumes business state or transport: ' + origin,
              );
          }
        }
        if (
          presentation &&
          ((statement.moduleSpecifier.text === '@angular/common/http' && name === 'HttpClient') ||
            (statement.moduleSpecifier.text === '@angular/router' && name === 'Router') ||
            name === 'HydraApiService')
        )
          report(
            'presentation',
            statement,
            'Presentational UI imports an orchestration dependency: ' + name,
          );
      }
    }
  }
  return violations;
}

/** Return one concrete cycle per strongly connected execution component. */
export function runtimeCycles(dependencies: Dependency[]): Dependency[][] {
  const graph = new Map<string, Dependency[]>();
  for (const edge of dependencies) {
    if (!edge.runtime || edge.dynamic) continue;
    graph.set(edge.source, [...(graph.get(edge.source) ?? []), edge]);
  }
  const indices = new Map<string, number>();
  const low = new Map<string, number>();
  const stack: string[] = [];
  const active = new Set<string>();
  const components: string[][] = [];
  function visit(node: string): void {
    indices.set(node, indices.size);
    low.set(node, recorded(indices, node));
    stack.push(node);
    active.add(node);
    for (const edge of graph.get(node) ?? []) {
      if (!indices.has(edge.target)) {
        visit(edge.target);
        low.set(node, Math.min(recorded(low, node), recorded(low, edge.target)));
      } else if (active.has(edge.target))
        low.set(node, Math.min(recorded(low, node), recorded(indices, edge.target)));
    }
    if (low.get(node) === indices.get(node)) {
      const component: string[] = [];
      let member: string;
      do {
        const popped = stack.pop();
        if (popped === undefined) throw new Error('Incomplete cycle traversal stack.');
        member = popped;
        active.delete(member);
        component.push(member);
      } while (member !== node);
      if (component.length > 1 || (graph.get(node) ?? []).some((edge) => edge.target === node))
        components.push(component);
    }
  }
  for (const node of graph.keys()) if (!indices.has(node)) visit(node);
  return components.map((component) => {
    const members = new Set(component);
    const start = component[0];
    function find(node: string, visited: Set<string>): Dependency[] | undefined {
      for (const edge of graph.get(node) ?? []) {
        if (!members.has(edge.target)) continue;
        if (edge.target === start) return [edge];
        if (!visited.has(edge.target)) {
          const tail = find(edge.target, new Set(visited).add(edge.target));
          if (tail) return [edge].concat(tail);
        }
      }
      return undefined;
    }
    const cycle = find(start, new Set([start]));
    if (!cycle) throw new Error('No path within a detected execution cycle.');
    return cycle;
  });
}
