import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkFingerprint, fingerprint, referenceCommit } from './check-reference.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const repository = 'DevSkyLex/fireguard-api';
const source = 'openapi.json';

export function syncArguments(args) {
  let sourcePath;
  let commit;
  let check = false;
  for (let index = 0; index < args.length; index++) {
    const argument = args[index];
    if (argument === '--check') {
      if (check) throw new Error('Specify --check only once.');
      check = true;
    } else if (argument === '--commit') {
      if (commit !== undefined || !args[index + 1] || args[index + 1].startsWith('--'))
        throw new Error('Specify --commit once with a full immutable API commit.');
      commit = args[++index];
      referenceCommit({ repository, source, commit });
    } else if (argument.startsWith('--') || sourcePath !== undefined) {
      throw new Error('Expected one API export path and optional --check / --commit arguments.');
    } else {
      sourcePath = argument;
    }
  }
  return {
    sourcePath: resolve(root, sourcePath ?? '../fireguard-api/openapi.json'),
    check,
    commit,
  };
}

export function verifiedCommit(document, sourcePath, commit, readGit = execFileSync) {
  referenceCommit({ repository, source, commit });
  const committedDocument = JSON.parse(
    readGit('git', ['-C', dirname(sourcePath), 'show', commit + ':' + source], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    }),
  );
  checkFingerprint({ sha256: fingerprint(document) }, committedDocument);
  return commit;
}

export function synchronizeOpenApi({
  sourcePath,
  check = false,
  commit,
  targetPath = fileURLToPath(new URL('./fixtures/openapi.json', import.meta.url)),
  metadataPath = fileURLToPath(new URL('./fixtures/source.json', import.meta.url)),
}) {
  const document = JSON.parse(readFileSync(sourcePath, 'utf8'));
  if (!/^3\.[12]\./.test(document.openapi) || !document.paths || !document.components?.schemas)
    throw new Error('Expected the exported API OpenAPI document.');
  const snapshot = JSON.stringify(document, null, 2) + '\n';
  const metadata = { repository, source, sha256: fingerprint(document) };
  if (commit !== undefined) {
    metadata.commit = verifiedCommit(document, sourcePath, commit);
  } else if (existsSync(metadataPath)) {
    const previous = JSON.parse(readFileSync(metadataPath, 'utf8'));
    if (previous.commit !== undefined) {
      referenceCommit(previous);
      if (previous.sha256 === metadata.sha256) {
        checkFingerprint(previous, JSON.parse(readFileSync(targetPath, 'utf8')));
        metadata.commit = previous.commit;
      }
    }
  }
  if (check) {
    if (JSON.stringify(JSON.parse(readFileSync(targetPath, 'utf8'))) !== JSON.stringify(document))
      throw new Error(
        'OpenAPI snapshot differs from the API export. Run npm run test:contracts:sync and review both changes.',
      );
    return 'OpenAPI snapshot matches the canonical API export.\n';
  }
  writeFileSync(targetPath, snapshot);
  writeFileSync(metadataPath, JSON.stringify(metadata, null, 2) + '\n');
  return 'Updated the versioned API contract and its content fingerprint.\n';
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.stdout.write(synchronizeOpenApi(syncArguments(process.argv.slice(2))));
}
