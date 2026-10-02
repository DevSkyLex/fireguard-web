import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

// A real floating promise must fail before the application lint can be trusted.
const directory = mkdtempSync(join(tmpdir(), 'fireguard-type-aware-'));
try {
  const fixture = join(directory, 'sentinel.ts');
  writeFileSync(fixture, 'Promise.resolve(42);\nvoid Promise.resolve(42);\n');
  writeFileSync(
    join(directory, 'tsconfig.json'),
    JSON.stringify({ compilerOptions: { strict: true, target: 'ES2023' }, files: ['sentinel.ts'] }),
  );
  const result = spawnSync(
    process.execPath,
    [
      resolve('node_modules/oxlint/bin/oxlint'),
      '--type-aware',
      '--no-ignore',
      '-c',
      resolve('.oxlintrc.type-aware.json'),
      '--tsconfig',
      join(directory, 'tsconfig.json'),
      '--format=json',
      fixture,
    ],
    { encoding: 'utf8', windowsHide: true },
  );
  if (result.error) throw result.error;
  assert.equal(
    result.status,
    1,
    'The type-aware promise sentinel must fail lint: ' + result.stderr + result.stdout,
  );
  const diagnostics = JSON.parse(result.stdout).diagnostics;
  assert.equal(
    diagnostics.filter((item) => /no-floating-promises/.test(item.code)).length,
    1,
    'The type-aware engine must report exactly the unhandled promise.',
  );
  process.stdout.write('Type-aware no-floating-promises engine verified.\n');
} finally {
  rmSync(directory, { recursive: true, force: true });
}
