#!/usr/bin/env node
/**
 * PostToolUse hook (fireguard-sso-web) — auto-format the file Claude just edited
 * with the project's own oxfmt config, so no change ever fails `npm run format:check`
 * for whitespace reasons alone.
 *
 *  - `*.{ts,html,css,scss,json,mjs,js,md}` → `npx oxfmt -c .oxfmtrc.json <file>`
 *
 * `.md` is in the list because `.oxfmtrc.json` carries an explicit markdown override and
 * `npm run format:check` walks the whole tree — so an unformatted `FEATURE.md` or
 * `ARCHITECTURE.md` fails the quality gate. Since section 14.3 requires agents to update
 * those docs in the same change, leaving markdown out of this hook guarantees a red gate.
 *
 * Anything else (lockfiles, generated trees) is a silent no-op. Degrades to a
 * no-op when the toolchain is not installed, so it is safe in a fresh checkout. A
 * genuine formatting failure of an existing source file is reported on stderr with
 * exit 2 so Claude sees it; everything else exits 0.
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

// The app root is found by walking up FROM THE EDITED FILE until .oxfmtrc.json
// appears. The script's own location cannot be used: `claude plugin install` COPIES
// this .claude/ into ~/.claude/plugins/cache, so in plugin mode the running copy
// lives nowhere near the app. Anchoring on the edited file works in both modes and
// self-scopes the hook — a file outside this app never finds .oxfmtrc.json above it,
// and the hook stays a silent no-op.
function findAppRoot(fromFile, markerSegments) {
  let dir = path.dirname(path.resolve(fromFile));
  for (;;) {
    if (existsSync(path.join(dir, ...markerSegments))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

const FORMATTABLE = new Set(['.ts', '.html', '.css', '.scss', '.json', '.mjs', '.js', '.md']);
const SKIP_SEGMENTS = [
  '/node_modules/',
  '/dist/',
  '/.angular/',
  '/.git/',
  '/test-results/',
  '/playwright-report/',
  '/.claude/worktrees/',
  '/.impeccable/',
  '/coverage/',
  '/out-tsc/',
  '/tmp/',
  '/.build-check-',
];

function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.on('data', (chunk) => (data += chunk));
    process.stdin.on('end', () => resolve(data));
    if (process.stdin.isTTY) resolve('');
  });
}

const raw = await readStdin();
let payload = {};
try {
  payload = JSON.parse(raw || '{}');
} catch {
  process.exit(0);
}

const filePath = payload?.tool_input?.file_path ?? payload?.tool_input?.filePath;
if (!filePath || !existsSync(filePath)) process.exit(0);

const normalized = filePath.replace(/\\/g, '/');
if (SKIP_SEGMENTS.some((seg) => normalized.includes(seg))) process.exit(0);
if (!FORMATTABLE.has(path.extname(normalized).toLowerCase())) process.exit(0);

const root = findAppRoot(filePath, ['.oxfmtrc.json']);
if (!root) process.exit(0);

// oxfmt's npm `bin` entry is a JS launcher run by Node itself. Invoking it through
// `process.execPath` — instead of `npx` with `shell: true` — removes the npx cold
// start on every edit, the Windows quoting hazard on paths with spaces, and the
// EINVAL modern Node raises when spawning a `.cmd` shim without a shell.
const oxfmtEntry = path.join(root, 'node_modules', 'oxfmt', 'bin', 'oxfmt');
if (!existsSync(oxfmtEntry)) process.exit(0);

try {
  execFileSync(process.execPath, [oxfmtEntry, '-c', '.oxfmtrc.json', filePath], {
    cwd: root,
    stdio: 'ignore',
  });
} catch (error) {
  // ENOENT (toolchain absent) must not block; a real formatting failure should.
  if (error?.code === 'ENOENT') process.exit(0);
  process.stderr.write(`format hook: oxfmt failed for ${filePath}: ${error.message}\n`);
  process.exit(2);
}

process.exit(0);
