import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { fingerprint } from './check-reference.mjs';
import { syncArguments, synchronizeOpenApi, verifiedCommit } from './sync-openapi.mjs';

const commit = 'a'.repeat(40);
const document = { openapi: '3.2.0', paths: {}, components: { schemas: {} } };
const metadata = {
  repository: 'DevSkyLex/fireguard-api',
  source: 'openapi.json',
  sha256: fingerprint(document),
};

function fixture(context, previous = metadata, snapshot = document) {
  const directory = mkdtempSync(join(tmpdir(), 'fireguard-openapi-sync-'));
  context.after(() => rmSync(directory, { recursive: true, force: true }));
  const paths = {
    sourcePath: join(directory, 'export.json'),
    targetPath: join(directory, 'snapshot.json'),
    metadataPath: join(directory, 'source.json'),
  };
  writeFileSync(paths.sourcePath, JSON.stringify(document));
  writeFileSync(paths.targetPath, JSON.stringify(snapshot));
  if (previous !== null) writeFileSync(paths.metadataPath, JSON.stringify(previous));
  return {
    paths,
    readMetadata: () => JSON.parse(readFileSync(paths.metadataPath, 'utf8')),
    before: () => [paths.targetPath, paths.metadataPath].map((path) => readFileSync(path, 'utf8')),
  };
}

test('parses options independently of the optional export path', () => {
  const options = syncArguments(['--commit', commit, '--check', '/api/openapi.json']);
  assert.equal(options.commit, commit);
  assert.equal(options.check, true);
  assert.equal(options.sourcePath, resolve('/api/openapi.json'));
  assert.equal(syncArguments(['--check']).commit, undefined);
  assert.equal(syncArguments([]).check, false);
});

test('rejects ambiguous options and nonimmutable Git references', () => {
  for (const args of [
    ['--commit'],
    ['--commit', '--check'],
    ['--commit', 'develop'],
    ['--commit', commit, '--commit', commit],
    ['--check', '--check'],
    ['one.json', 'two.json'],
    ['--unknown'],
  ]) {
    assert.throws(() => syncArguments(args));
  }
});

test('verifies the exact committed export with shell-free Git arguments', () => {
  const path = resolve('/api/openapi.json');
  const calls = [];
  assert.equal(
    verifiedCommit(document, path, commit, (...args) => {
      calls.push(args);
      return JSON.stringify(document, null, 4);
    }),
    commit,
  );
  assert.deepEqual(calls, [
    [
      'git',
      ['-C', resolve('/api'), 'show', commit + ':openapi.json'],
      { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
    ],
  ]);
});

test('rejects an unverified export or revision before claiming provenance', () => {
  assert.throws(
    () =>
      verifiedCommit(document, '/api/openapi.json', commit, () =>
        JSON.stringify({ ...document, paths: { '/changed': {} } }),
      ),
    /fingerprint/,
  );
  let read = false;
  assert.throws(
    () =>
      verifiedCommit(document, '/api/openapi.json', '--help', () => {
        read = true;
      }),
    /immutable API commit/,
  );
  assert.equal(read, false);
  assert.throws(
    () =>
      verifiedCommit(document, '/api/openapi.json', commit, () => {
        throw new Error('Unknown revision');
      }),
    /Unknown revision/,
  );
});

test('retains a reviewed commit only when the export and existing snapshot match its digest', (context) => {
  const state = fixture(context, { ...metadata, commit });
  synchronizeOpenApi(state.paths);
  assert.deepEqual(state.readMetadata(), { ...metadata, commit });
});

test('does not invent a revision for an uncommitted export', (context) => {
  const state = fixture(context);
  synchronizeOpenApi(state.paths);
  assert.deepEqual(state.readMetadata(), metadata);
});

test('creates new metadata without inventing a revision', (context) => {
  const state = fixture(context, null);
  synchronizeOpenApi(state.paths);
  assert.deepEqual(state.readMetadata(), metadata);
});

test('removes the old revision when the API contract changes', (context) => {
  const state = fixture(context, { ...metadata, commit });
  const changed = { ...document, paths: { '/changed': {} } };
  writeFileSync(state.paths.sourcePath, JSON.stringify(changed));
  synchronizeOpenApi(state.paths);
  assert.deepEqual(state.readMetadata(), { ...metadata, sha256: fingerprint(changed) });
  assert.deepEqual(JSON.parse(readFileSync(state.paths.targetPath, 'utf8')), changed);
});

test('rejects foreign metadata and invalid recorded commits before writing', (context) => {
  for (const previous of [
    { ...metadata, commit, repository: 'other/repo' },
    { ...metadata, commit, source: '../other.json' },
    { ...metadata, commit: 'develop' },
  ]) {
    const state = fixture(context, previous);
    const before = state.before();
    assert.throws(() => synchronizeOpenApi(state.paths));
    assert.deepEqual(state.before(), before);
  }
});

test('does not preserve a recorded revision if its independent snapshot was corrupted', (context) => {
  const state = fixture(
    context,
    { ...metadata, commit },
    { ...document, paths: { '/corrupted': {} } },
  );
  const before = state.before();
  assert.throws(() => synchronizeOpenApi(state.paths), /fingerprint/);
  assert.deepEqual(state.before(), before);
});

test('check mode reports drift without changing either tracked artifact', (context) => {
  const state = fixture(context, { ...metadata, commit });
  const before = state.before();
  assert.match(synchronizeOpenApi({ ...state.paths, check: true }), /matches/);
  assert.deepEqual(state.before(), before);
  writeFileSync(state.paths.sourcePath, JSON.stringify({ ...document, paths: { '/changed': {} } }));
  assert.throws(() => synchronizeOpenApi({ ...state.paths, check: true }), /snapshot differs/);
  assert.deepEqual(state.before(), before);
});
