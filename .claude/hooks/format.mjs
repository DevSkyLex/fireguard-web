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

const FORMATTABLE = new Set(['.ts', '.html', '.css', '.scss', '.json', '.mjs', '.js', '.md']);
const SKIP_SEGMENTS = [
  '/node_modules/',
  '/dist/',
  '/.angular/',
  '/.git/',
  '/test-results/',
  '/playwright-report/',
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

const root = (payload?.cwd ?? process.cwd()).replace(/\\/g, '/');
if (!existsSync(path.join(root, '.oxfmtrc.json'))) process.exit(0);

// The binary itself must be installed. `npx oxfmt` on a missing package exits
// non-zero with "not recognized" rather than raising ENOENT, so execFileSync
// cannot tell a missing toolchain from a real formatting failure — check first.
const oxfmtBin = path.join(root, 'node_modules', '.bin', 'oxfmt');
if (!existsSync(oxfmtBin) && !existsSync(`${oxfmtBin}.cmd`)) process.exit(0);

try {
  execFileSync('npx', ['oxfmt', '-c', '.oxfmtrc.json', filePath], {
    cwd: root,
    stdio: 'ignore',
    shell: process.platform === 'win32',
  });
} catch (error) {
  // ENOENT (toolchain absent) must not block; a real formatting failure should.
  if (error?.code === 'ENOENT') process.exit(0);
  process.stderr.write(`format hook: oxfmt failed for ${filePath}: ${error.message}\n`);
  process.exit(2);
}

process.exit(0);
