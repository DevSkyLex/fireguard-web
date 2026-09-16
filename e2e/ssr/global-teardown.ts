import { readFile } from 'node:fs/promises';
import { request } from 'node:https';
import { resolve } from 'node:path';

/**
 * Function waitForCleanup
 * @description Polls only this launcher's certificate with a bounded asynchronous retry.
 * @access private
 * @since 1.0.0
 * @param {string} certificate Exact ephemeral certificate path recorded by this launcher.
 * @param {number} remaining Number of checks still allowed.
 * @returns {Promise<void>} Resolves after cleanup, otherwise rejects after at most five seconds.
 */
async function waitForCleanup(certificate: string, remaining = 50): Promise<void> {
  const exists = await readFile(certificate).then(
    () => true,
    (error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') return false;
      throw error;
    },
  );
  if (!exists) return;
  if (remaining <= 1) throw new Error('SSR launcher did not finish its scoped TLS cleanup.');
  await new Promise((accept) => setTimeout(accept, 100));
  return waitForCleanup(certificate, remaining - 1);
}

/**
 * Function globalTeardown
 * @description Asks only this run's local launcher to stop its child and remove ephemeral TLS
 * material before Playwright tears down its Windows process wrapper. Checks the final ledger
 * after cleanup, including unexpected requests arriving after the last test assertion.
 * @access public
 * @since 1.0.0
 * @returns {Promise<void>} Verified local shutdown response; no process-name or broad PID kills.
 */
export default async function globalTeardown(): Promise<void> {
  const run = process.env['FG_SSR_RUN'] ?? 'current';
  if (!/^[a-zA-Z0-9_-]+$/.test(run)) throw new Error('Invalid SSR run name.');
  const directory = resolve('e2e/artifacts/ssr-smoke', run, 'server');
  const metadata = JSON.parse(await readFile(resolve(directory, 'processes.json'), 'utf8'));
  const ca = await readFile(metadata.certificate);
  await new Promise<void>((accept, reject) => {
    const shutdown = request(
      'https://127.0.0.1:4275/__harness/shutdown',
      { method: 'POST', ca },
      (response) => {
        response.resume();
        response.on('end', () =>
          response.statusCode === 200
            ? accept()
            : reject(new Error(`SSR shutdown HTTP ${response.statusCode}`)),
        );
      },
    );
    shutdown.on('error', reject);
    shutdown.setTimeout(5_000, () => shutdown.destroy(new Error('SSR shutdown timed out.')));
    shutdown.end();
  });
  await waitForCleanup(metadata.certificate);
  const ledger = JSON.parse(await readFile(resolve(directory, 'server-requests.json'), 'utf8'));
  if (!Array.isArray(ledger.unexpected) || ledger.unexpected.length !== 0)
    throw new Error(`SSR final hermetic ledger failed: ${JSON.stringify(ledger.unexpected)}`);
}
