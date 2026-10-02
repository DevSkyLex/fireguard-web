import { createHash } from 'node:crypto';
import { readFileSync, appendFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
export function fingerprint(document) {
  return createHash('sha256')
    .update(JSON.stringify(document, null, 2) + '\n')
    .digest('hex');
}
export function referenceCommit(source) {
  if (source.repository !== 'DevSkyLex/fireguard-api' || source.source !== 'openapi.json')
    throw new Error('Unexpected API contract repository or source path.');
  const commit = source.commit;
  if (typeof commit !== 'string' || commit.length !== 40 || !/^[a-f0-9]{40}$/.test(commit))
    throw new Error('Record a verified immutable API commit in fixtures/source.json.');
  return commit;
}
export function checkFingerprint(source, document) {
  if (!/^[a-f0-9]{64}$/.test(source.sha256 ?? '') || fingerprint(document) !== source.sha256)
    throw new Error('API contract content differs from its reviewed SHA-256 fingerprint.');
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const source = JSON.parse(
    readFileSync(resolve(root, 'tests/contracts/fixtures/source.json'), 'utf8'),
  );
  const snapshot = JSON.parse(
    readFileSync(resolve(root, 'tests/contracts/fixtures/openapi.json'), 'utf8'),
  );
  checkFingerprint(source, snapshot);
  const commit = referenceCommit(source);
  if (process.argv.includes('--resolve')) {
    if (!process.env['GITHUB_OUTPUT'])
      throw new Error('GITHUB_OUTPUT is required for CI commit resolution.');
    appendFileSync(process.env['GITHUB_OUTPUT'], 'commit=' + commit + '\n');
  } else {
    const path = process.env['FIREGUARD_OPENAPI_PATH'];
    if (!path)
      throw new Error(
        'FIREGUARD_OPENAPI_PATH must point to the API export checked out at ' + commit,
      );
    checkFingerprint(source, JSON.parse(readFileSync(path, 'utf8')));
    process.stdout.write(
      'Canonical API export at ' + commit + ' matches the reviewed contract fingerprint.\n',
    );
  }
}
