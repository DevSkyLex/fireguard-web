const { readFileSync } = require('node:fs');
const { resolve, relative, isAbsolute } = require('node:path');
const ts = require('typescript');

const root = resolve(__dirname, '..');

/**
 * Function compileHarnessTypeScript
 * @description Loads only authored E2E TypeScript for static report regeneration, without
 * writing compiled files or starting Playwright/Angular. External dependencies keep Node's loader.
 * @access private
 * @since 1.0.0
 * @param {NodeModule} module - Current CommonJS module.
 * @param {string} filename - Resolved harness source path.
 * @returns {void}
 */
function compileHarnessTypeScript(module, filename) {
  const local = relative(root, filename);
  if (local.startsWith('..') || isAbsolute(local))
    throw new Error('Only e2e TypeScript may be compiled by this loader.');
  // eslint-disable-next-line no-underscore-dangle -- Node compiles the scoped source in memory, preserving imports without generated files.
  module._compile(
    ts.transpileModule(readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    filename,
  );
}

require.extensions['.ts'] = compileHarnessTypeScript;
