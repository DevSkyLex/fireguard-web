const { spawn, spawnSync } = require('node:child_process');
const {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
  unlinkSync,
  rmdirSync,
} = require('node:fs');
const { createServer } = require('node:https');
const { resolve } = require('node:path');
const { createApiStub } = require('./api-stub.cjs');

const root = resolve(__dirname, '../..');
const checkOnly = process.argv.includes('--check');
const bundle = checkOnly
  ? resolve(__dirname, 'check-transport.cjs')
  : resolve(root, 'dist/fireguard-web-e2e-ssr/server/server.mjs');
if (!existsSync(bundle))
  throw new Error('SSR smoke bundle missing. Run npm run e2e:ssr:build first.');
const appOrigin = 'http://127.0.0.1:4274';
const apiOrigin = 'https://127.0.0.1:4275';
const run = process.env.FG_SSR_RUN ?? 'current';
if (!/^[a-zA-Z0-9_-]+$/.test(run)) throw new Error('FG_SSR_RUN must be a simple directory name.');
const artifacts = resolve(
  root,
  'e2e/artifacts/ssr-smoke',
  checkOnly ? 'transport-check' : `${run}/server`,
);
mkdirSync(artifacts, { recursive: true });
if (!checkOnly) {
  const buildMetadata = resolve(root, 'dist/fireguard-web-e2e-ssr/e2e-build.json');
  if (existsSync(buildMetadata))
    writeFileSync(resolve(artifacts, 'build.json'), readFileSync(buildMetadata));
}
const tlsDirectory = mkdtempSync(resolve(artifacts, 'tls-'));
const key = resolve(tlsDirectory, 'key.pem');
const cert = resolve(tlsDirectory, 'cert.pem');
const certificate = spawnSync(
  'openssl',
  [
    'req',
    '-x509',
    '-newkey',
    'rsa:2048',
    '-sha256',
    '-nodes',
    '-days',
    '2',
    '-subj',
    '/CN=localhost',
    '-addext',
    'subjectAltName=DNS:localhost,IP:127.0.0.1',
    '-keyout',
    key,
    '-out',
    cert,
  ],
  { cwd: root, windowsHide: true, encoding: 'utf8' },
);
if (certificate.error || certificate.status !== 0)
  throw new Error(
    `OpenSSL could not generate the ephemeral local test certificate: ${certificate.error ?? certificate.stderr}`,
  );
const stub = createApiStub(appOrigin, () => finish(0));
const server = createServer({ key: readFileSync(key), cert: readFileSync(cert) }, stub.handler);
let child;
let finishing = false;

/**
 * Function finish
 * @description Stops only this launcher's child and persists server-side request evidence.
 * @access private
 * @since 1.0.0
 * @param {number} code - Final process exit code.
 * @returns {void}
 */
function finish(code) {
  if (finishing) return;
  finishing = true;
  writeFileSync(
    resolve(artifacts, 'server-requests.json'),
    JSON.stringify({ requests: stub.requests, unexpected: stub.unexpected }, null, 2),
  );
  const close = () => {
    server.closeAllConnections();
    server.close(() => {
      unlinkSync(key);
      unlinkSync(cert);
      rmdirSync(tlsDirectory);
      process.exit(code);
    });
  };
  if (child && child.exitCode === null && child.signalCode === null) {
    child.once('exit', close);
    child.kill();
  } else close();
}

server.on('error', (error) => {
  process.stderr.write(`${error.message}\n`);
  finish(1);
});
server.listen(4275, '127.0.0.1', () => {
  child = spawn(process.execPath, ['--require', resolve(__dirname, 'network-guard.cjs'), bundle], {
    cwd: root,
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    env: {
      ...process.env,
      PORT: '4274',
      NODE_USE_ENV_PROXY: '0',
      NODE_EXTRA_CA_CERTS: cert,
      FIREGUARD_RUNTIME_CONFIG: 'true',
      APP_API_URL: apiOrigin,
      APP_NAME: 'Fireguard SSR smoke',
      APP_MERCURE_HUB_URL: `${apiOrigin}/.well-known/mercure`,
      APP_MAINTENANCE: 'false',
      FG_SSR_API_ORIGIN: apiOrigin,
      FG_SSR_APP_ORIGIN: appOrigin,
    },
  });
  writeFileSync(
    resolve(artifacts, 'processes.json'),
    JSON.stringify(
      { launcherPid: process.pid, serverPid: child.pid, appOrigin, apiOrigin, certificate: cert },
      null,
      2,
    ),
  );
  child.stdout.pipe(process.stdout);
  child.stderr.pipe(process.stderr);
  child.on('message', (message) => {
    if (message.type === 'FG_SSR_EXTERNAL_REQUEST') stub.unexpected.push(message);
  });
  child.on('error', (error) => {
    process.stderr.write(`${error.message}\n`);
    finish(1);
  });
  child.on('exit', (code) => finish(code ?? 1));
});
process.once('SIGINT', () => finish(0));
process.once('SIGTERM', () => finish(0));
