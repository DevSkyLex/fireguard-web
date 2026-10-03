import { readFile } from 'node:fs/promises';
import { requiredEnvironment, object, text } from './live-api.helper';

/** Rejects missing, stale or incomplete infrastructure evidence before opening a browser. */
export default async function globalSetup(): Promise<void> {
  const runId = requiredEnvironment('FG_LIVE_RUN_ID');
  if (!/^[a-z0-9_]{4,64}$/.test(runId))
    throw new Error('FG_LIVE_RUN_ID must identify one isolated run.');
  const webUrl = new URL(requiredEnvironment('FG_LIVE_WEB_URL'));
  const apiUrl = new URL(requiredEnvironment('FG_LIVE_API_URL'));
  const hubUrl = new URL(requiredEnvironment('FG_LIVE_MERCURE_URL'));
  for (const url of [webUrl, apiUrl, hubUrl]) {
    if (url.protocol !== 'https:') throw new Error('Live integration requires trusted HTTPS URLs.');
    if (url.username || url.password) throw new Error('Live URLs must not contain credentials.');
  }
  if (webUrl.origin === apiUrl.origin)
    throw new Error('Distinct web/API origins are required to exercise CORS.');
  requiredEnvironment('FG_LIVE_EMAIL');
  requiredEnvironment('FG_LIVE_PASSWORD');
  const evidence = object(
    JSON.parse(await readFile(requiredEnvironment('FG_LIVE_READINESS_FILE'), 'utf8')),
  );
  if (evidence['version'] !== 1 || evidence['runId'] !== runId || evidence['isolated'] !== true) {
    throw new Error('Readiness evidence must identify this isolated run.');
  }
  for (const [key, expected] of [
    ['webUrl', webUrl.href],
    ['apiUrl', apiUrl.href],
    ['mercureUrl', hubUrl.href],
  ] as const) {
    if (evidence[key] !== expected) throw new Error(`Readiness URL mismatch: ${key}.`);
  }
  const checkedAt = Date.parse(text(evidence, 'checkedAt'));
  if (!Number.isFinite(checkedAt) || Date.now() - checkedAt > 600_000 || checkedAt > Date.now()) {
    throw new Error('Infrastructure probes must have completed within ten minutes.');
  }
  const databases = object(evidence['databases']);
  const auth = text(databases, 'auth');
  const main = text(databases, 'main');
  for (const name of [auth, main]) {
    if (!/_(test|e2e|live)_/.test(name) || !name.includes(runId)) {
      throw new Error('Database evidence must name disposable databases scoped to this run.');
    }
  }
  if (auth === main) throw new Error('Auth and main must remain separate databases.');
  const probes = object(evidence['probes']);
  for (const name of [
    'auth-migrations',
    'main-migrations',
    'auth-worker',
    'main-worker',
    'worker-queues',
  ]) {
    const probe = object(probes[name]);
    if (probe['exitCode'] !== 0 || text(probe, 'command').length < 8) {
      throw new Error(`Infrastructure probe did not succeed: ${name}.`);
    }
  }
}
