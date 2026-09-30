import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const source = resolve(root, process.argv[2] ?? '../fireguard-api/openapi.json');
const document = JSON.parse(readFileSync(source, 'utf8'));
if (!/^3\.[12]\./.test(document.openapi) || !document.paths || !document.components?.schemas)
  throw new Error('Expected the exported API OpenAPI document.');
const snapshot = JSON.stringify(document, null, 2) + '\n';
const target = new URL('./fixtures/openapi.json', import.meta.url);
if (process.argv.includes('--check')) {
  if (JSON.stringify(JSON.parse(readFileSync(target, 'utf8'))) !== JSON.stringify(document))
    throw new Error(
      'OpenAPI snapshot differs from the API export. Run npm run test:contracts:sync and review both changes.',
    );
  process.stdout.write('OpenAPI snapshot matches the canonical API export.\n');
} else {
  writeFileSync(target, snapshot);
  writeFileSync(
    new URL('./fixtures/source.json', import.meta.url),
    JSON.stringify(
      {
        repository: 'DevSkyLex/fireguard-api',
        source: 'openapi.json',
        sha256: createHash('sha256').update(snapshot).digest('hex'),
      },
      null,
      2,
    ) + '\n',
  );
  process.stdout.write('Updated the versioned API contract and its content fingerprint.\n');
}
