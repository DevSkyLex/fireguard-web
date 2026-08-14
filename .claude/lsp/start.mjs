#!/usr/bin/env node
/**
 * LSP launcher — resolves the app directory at runtime so nothing here is machine-specific.
 *
 * `${CLAUDE_PLUGIN_ROOT}` points at the plugin *cache copy*, which cannot reach the app's
 * node_modules, and `${CLAUDE_PROJECT_DIR}` is the monorepo root in a root session but the
 * app itself in an app session. No single expansion covers both, so this file finds the app
 * by looking for `angular.json`, then:
 *
 *  1. spawns the real language server from the app's own node_modules, with the app as cwd;
 *  2. rewrites `rootUri` / `rootPath` / `workspaceFolders` in the ONE `initialize` request,
 *     which is what `workspaceFolder` in .lsp.json used to hardcode;
 *  3. pipes every later byte through untouched — the framing is parsed exactly once, so a
 *     bug here cannot corrupt a running session.
 *
 * Usage: node start.mjs <typescript|angular>
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const APP_MARKER = 'angular.json';
const APP_DIRNAME = 'fireguard-sso-web';

/** Candidate roots, most specific first; the first one holding APP_MARKER wins. */
function resolveAppDir() {
  const seeds = [process.env.CLAUDE_PROJECT_DIR, process.cwd()]
    .filter(Boolean)
    .map((p) => resolve(p));
  const candidates = [];
  for (const seed of seeds) {
    candidates.push(seed, join(seed, APP_DIRNAME));
    for (let dir = seed, up = dirname(dir); up !== dir; dir = up, up = dirname(dir))
      candidates.push(up, join(up, APP_DIRNAME));
  }
  return candidates.find((c) => existsSync(join(c, APP_MARKER)));
}

const SERVERS = {
  typescript: (app) => [
    join(app, 'node_modules/typescript-language-server/lib/cli.mjs'),
    '--stdio',
  ],
  angular: (app) => [
    join(app, 'node_modules/@angular/language-server/bin/ngserver'),
    '--stdio',
    '--tsProbeLocations',
    app,
    '--ngProbeLocations',
    app,
  ],
};

const name = process.argv[2];
if (!SERVERS[name]) {
  process.stderr.write(
    `[lsp-launcher] unknown server "${name}" — expected one of ${Object.keys(SERVERS).join(', ')}\n`,
  );
  process.exit(2);
}

const app = resolveAppDir();
if (!app) {
  process.stderr.write(
    `[lsp-launcher] no ${APP_MARKER} found from CLAUDE_PROJECT_DIR=${process.env.CLAUDE_PROJECT_DIR} or cwd=${process.cwd()}\n`,
  );
  process.exit(2);
}

const args = SERVERS[name](app);
if (!existsSync(args[0])) {
  process.stderr.write(`[lsp-launcher] ${name}: ${args[0]} is missing — run npm ci in ${app}\n`);
  process.exit(2);
}

const child = spawn(process.execPath, args, { cwd: app, stdio: ['pipe', 'pipe', 'inherit'] });
child.on('error', (e) => {
  process.stderr.write(`[lsp-launcher] spawn failed: ${e.message}\n`);
  process.exit(2);
});
child.on('exit', (code, signal) => process.exit(code ?? (signal ? 1 : 0)));

child.stdout.pipe(process.stdout);

const frame = (msg) => {
  const body = JSON.stringify(msg);
  return `Content-Length: ${Buffer.byteLength(body)}\r\n\r\n${body}`;
};

/** Rewrite the workspace roots the client asked for to the app we resolved. */
function retarget(msg) {
  if (msg?.method !== 'initialize' || !msg.params) return msg;
  const uri = pathToFileURL(app).href;
  msg.params.rootUri = uri;
  msg.params.rootPath = app;
  msg.params.workspaceFolders = [{ uri, name: APP_DIRNAME }];
  return msg;
}

let buf = Buffer.alloc(0);
let done = false;
process.stdin.on('data', (chunk) => {
  if (done) return;
  buf = Buffer.concat([buf, chunk]);
  const head = buf.indexOf('\r\n\r\n');
  if (head === -1) return;
  const len = Number(/Content-Length: (\d+)/i.exec(buf.subarray(0, head).toString())?.[1]);
  if (!Number.isFinite(len) || buf.length < head + 4 + len) return;

  const body = buf.subarray(head + 4, head + 4 + len).toString();
  const rest = buf.subarray(head + 4 + len);
  try {
    child.stdin.write(frame(retarget(JSON.parse(body))));
  } catch {
    child.stdin.write(buf.subarray(0, head + 4 + len)); // Unparseable: forward verbatim.
  }
  if (rest.length > 0) child.stdin.write(rest);

  done = true;
  buf = Buffer.alloc(0);
  process.stdin.pipe(child.stdin);
});
process.stdin.on('end', () => child.stdin.end());
