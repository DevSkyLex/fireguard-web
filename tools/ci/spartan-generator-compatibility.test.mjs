import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

/** Repository root used only to read the installed generator and workspace configuration. */
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
/** Resolve the same transitive packages that the installed Spartan CLI actually consumes. */
const workspaceRequire = createRequire(resolve(repositoryRoot, 'package.json'));
const cliPackagePath = workspaceRequire.resolve('@spartan-ng/cli/package.json');
const cliRequire = createRequire(cliPackagePath);
const nxRequire = createRequire(workspaceRequire.resolve('@nx/devkit'));
const { HostTree } = nxRequire('@angular-devkit/schematics');
const { SchematicTestRunner, UnitTestTree } = nxRequire('@angular-devkit/schematics/testing');
const { Project, SyntaxKind } = cliRequire('ts-morph');

/**
 * Function createWorkspaceTree
 *
 * @description
 * Copies configuration into a virtual workspace with a fresh Helm alias. Schematic posttasks
 * remain queued in the test runner and cannot install packages or write the actual workspace.
 *
 * @returns {import('@angular-devkit/schematics').Tree} Isolated schematic input tree.
 */
function createWorkspaceTree() {
  const tree = new UnitTestTree(new HostTree());
  for (const file of [
    'package.json',
    'package-lock.json',
    'angular.json',
    'tsconfig.json',
    'tsconfig.app.json',
  ]) {
    tree.create(file, readFileSync(resolve(repositoryRoot, file), 'utf8'));
  }
  tree.create(
    'components.json',
    JSON.stringify({
      componentsPath: 'compatibility-ui',
      importAlias: '@compatibility/ui',
      style: 'nova',
    }),
  );
  return tree;
}

test('Spartan generates a styled button with its resolved ts-morph in an isolated tree', async () => {
  const runner = new SchematicTestRunner(
    '@spartan-ng/cli',
    cliRequire.resolve('./generators.json'),
  );
  const input = createWorkspaceTree();
  const output = await runner.runSchematic('ui', { name: 'button' }, input);
  const buttonPath = output.files.find((file) => file.endsWith('/button/src/lib/hlm-button.ts'));
  assert.ok(
    buttonPath,
    'The real generator must create a button instead of skipping an existing alias.',
  );
  const button = output.readContent(buttonPath);

  assert.doesNotMatch(button, /\bspartan-button(?:-[\w-]+)?\b/);
  assert.match(button, /import \{ classes \} from '@compatibility\/ui\/utils'/);
  const project = new Project({ useInMemoryFileSystem: true });
  const source = project.createSourceFile('generated-button.ts', button);
  assert.equal(
    source.getClassOrThrow('HlmButton').getDecoratorOrThrow('Directive').getName(),
    'Directive',
  );
  const variants = source.getVariableDeclarationOrThrow('buttonVariants');
  const call = variants.getInitializerIfKindOrThrow(SyntaxKind.CallExpression);
  assert.equal(call.getExpression().getText(), 'cva');
  const baseClasses = call.getArguments()[0].getLiteralText().split(/\s+/);
  assert.ok(baseClasses.includes('rounded-lg'));
  assert.ok(baseClasses.includes('font-medium'));
  const configuration = call.getArguments()[1];
  const variantGroups = configuration
    .getPropertyOrThrow('variants')
    .getInitializerIfKindOrThrow(SyntaxKind.ObjectLiteralExpression);
  const appearances = variantGroups
    .getPropertyOrThrow('variant')
    .getInitializerIfKindOrThrow(SyntaxKind.ObjectLiteralExpression);
  assert.equal(
    appearances
      .getPropertyOrThrow('default')
      .getInitializerIfKindOrThrow(SyntaxKind.StringLiteral)
      .getLiteralText(),
    'bg-primary text-primary-foreground [a]:hover:bg-primary/80',
  );
  const sizes = variantGroups
    .getPropertyOrThrow('size')
    .getInitializerIfKindOrThrow(SyntaxKind.ObjectLiteralExpression);
  assert.equal(
    sizes
      .getPropertyOrThrow('default')
      .getInitializerIfKindOrThrow(SyntaxKind.StringLiteral)
      .getLiteralText(),
    'h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pe-2 has-data-[icon=inline-start]:ps-2',
  );
  assert.ok(output.files.some((file) => file.endsWith('/utils/src/index.ts')));
});
