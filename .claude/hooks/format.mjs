#!/usr/bin/env node
/**
 * PostToolUse hook — auto-format the file Claude just edited with oxfmt.
 *
 * Reads the hook payload from stdin, extracts the edited file path, and runs
 * `oxfmt -c .oxfmtrc.json <file>` when it is a formattable project source file.
 * Failures are reported on stderr (exit 2) so Claude sees them, but a missing
 * file or unsupported extension is a silent no-op.
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

const FORMATTABLE = new Set(['.ts', '.html', '.css', '.scss', '.json', '.mjs', '.js']);

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
if (!FORMATTABLE.has(path.extname(filePath).toLowerCase())) process.exit(0);

const projectDir = payload?.cwd ?? process.cwd();
try {
  execFileSync('npx', ['oxfmt', '-c', '.oxfmtrc.json', filePath], {
    cwd: projectDir,
    stdio: 'ignore',
    shell: process.platform === 'win32',
  });
} catch (error) {
  process.stderr.write(`oxfmt failed for ${filePath}: ${error.message}\n`);
  process.exit(2);
}
process.exit(0);
