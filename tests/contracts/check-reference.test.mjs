import assert from 'node:assert/strict';
import { test } from 'node:test';
import { referenceCommit, checkFingerprint, fingerprint } from './check-reference.mjs';

const commit = 'a'.repeat(40);
const document = { openapi: '3.2.0', paths: {} };
const source = {
  repository: 'DevSkyLex/fireguard-api',
  source: 'openapi.json',
  sha256: fingerprint(document),
};
test('requires an immutable API commit recorded in reviewed metadata', () => {
  assert.equal(referenceCommit({ ...source, commit }), commit);
  for (const invalid of [undefined, null, 'main', 'a'.repeat(39), commit + '\n', '../other', 123])
    assert.throws(() => referenceCommit({ ...source, commit: invalid }), /immutable API commit/);
});
test('does not fall back to a mutable external reference', () => {
  assert.throws(() => referenceCommit(source, commit), /immutable API commit/);
  assert.equal(referenceCommit({ ...source, commit }, 'b'.repeat(40)), commit);
});
test('only accepts the owning API repository and canonical export path', () => {
  assert.throws(
    () => referenceCommit({ ...source, commit, repository: 'other/repo' }),
    /Unexpected/,
  );
  assert.throws(() => referenceCommit({ ...source, commit, source: '../other' }), /Unexpected/);
});
test('compares the canonical export against the independent fingerprint', () => {
  checkFingerprint(source, document);
  assert.throws(
    () => checkFingerprint(source, { ...document, paths: { '/new': {} } }),
    /fingerprint/,
  );
  assert.throws(() => checkFingerprint({ ...source, sha256: 'wrong' }, document), /fingerprint/);
});
