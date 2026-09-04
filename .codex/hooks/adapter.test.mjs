import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { editsFromPatch } from './adapter.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const patch = (body) => ({ command: `*** Begin Patch\n${body}\n*** End Patch` });
function invoke(tool_name, tool_input, phase = 'pre', cwd = root) {
  return spawnSync(process.execPath, [path.join(root, '.codex/hooks/adapter.mjs'), phase], {
    cwd,
    input: JSON.stringify({ cwd, tool_name, tool_input }),
    encoding: 'utf8',
    windowsHide: true,
  });
}
function check(body, status = 2) {
  const result = invoke('apply_patch', patch(body));
  assert.equal(result.status, status, result.stderr);
}

test('parses multiple file edits and their rename destinations', () => {
  const edits = editsFromPatch(
    patch(
      '*** Add File: a.md\n+hello\n*** Update File: b.md\n*** Move to: c.md\n@@\n-old\n+new\n*** Delete File: d.md',
    ).command,
  );
  assert.equal(edits.length, 3);
  assert.equal(edits[1].destination, 'c.md');
  assert.match(edits[1].content, /new/);
  assert.doesNotMatch(edits[1].content, /old/);
});
test('rejects incomplete and missing patch payloads', () => {
  assert.equal(invoke('apply_patch', {}).status, 2);
  assert.throws(() => editsFromPatch('*** Begin Patch\n*** Add File: a.md\n+x'));
});
test('checks documentation without writing it', () => {
  check('*** Add File: docs/guard-test.md\n+Example', 0);
  assert.equal(existsSync(path.join(root, 'docs/guard-test.md')), false);
});
test('accepts native string patch arguments', () => {
  assert.equal(
    invoke('apply_patch', patch('*** Add File: docs/guard-test.md\n+Example').command).status,
    0,
  );
});
for (const file of [
  '.env',
  '.env.local',
  'node_modules/example/index.js',
  'src/environments/environment.ts',
]) {
  test(`protects ${file} from patch changes`, () => check(`*** Add File: ${file}\n+example`));
}
test('allows example environment documentation', () =>
  check('*** Add File: .env.example\n+PUBLIC_URL=example', 0));
test('checks a secret deletion', () => check('*** Delete File: .env.local'));
test('checks the destination of a rename', () =>
  check('*** Update File: docs/example.md\n*** Move to: .env.local\n@@\n-old\n+new'));
test('checks later files in a patch', () =>
  check('*** Add File: docs/example.md\n+ok\n*** Add File: .env.local\n+no'));
test('rejects traversal beyond the checkout', () => check('*** Add File: ../outside.md\n+no'));
test('rejects wildcard application barrels', () =>
  check("*** Add File: src/app/shared/example/index.ts\n+export * from './example';"));
test('keeps the documented vendored helm barrel exception', () =>
  check(
    "*** Add File: src/app/shared/ui/example/src/index.ts\n+export * from './lib/example';",
    0,
  ));
test('rejects component selectors in theme CSS', () =>
  check('*** Update File: src/styles.css\n@@\n+.example { color: red; }'));
test('rejects runtime services in models', () =>
  check(
    '*** Add File: src/app/features/example/models/example.service.ts\n+export class Example {}',
  ));
for (const [command, status] of [
  ['git status --short', 0],
  ['git reset --hard', 2],
  ['git switch -c codex/ui-cleanup', 0],
  ['git switch -c feat/ui-cleanup', 0],
  ['git switch -c Bad_Name', 2],
  ['git commit -m "Bad message"', 2],
  ['git commit -m "chore: adapt Codex tooling"', 0],
]) {
  test(`shell policy: ${command}`, () => assert.equal(invoke('Bash', { command }).status, status));
}
test('accepts unified exec cmd input', () =>
  assert.equal(invoke('exec_command', { cmd: 'git status --short' }).status, 0));
test('post hook skips a deleted file', () =>
  assert.equal(invoke('apply_patch', patch('*** Delete File: docs/absent.xyz'), 'post').status, 0));
test('manifest hook resolves from a nested working directory', () => {
  const manifest = JSON.parse(readFileSync(path.join(root, '.codex/hooks.json'), 'utf8'));
  const command = manifest.hooks.PreToolUse[0].hooks[0].command;
  const cwd = path.join(root, '.codex/hooks');
  const result = spawnSync(command, {
    shell: true,
    cwd,
    input: JSON.stringify({
      cwd,
      tool_name: 'Bash',
      tool_input: { command: 'git status --short' },
    }),
    encoding: 'utf8',
    windowsHide: true,
  });
  assert.equal(result.status, 0, result.stderr);
});
