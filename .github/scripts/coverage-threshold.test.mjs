import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateCoverage, loadCoverage } from './coverage-threshold.mjs';

function workspace(minimum = 90) {
  return {
    projects: {
      'fireguard-web': {
        architect: {
          test: { configurations: { coverage: { coverageThresholds: { lines: minimum } } } },
        },
      },
    },
  };
}

test('calculates coverage from covered and total lines rather than trusting reported percentage', () => {
  assert.deepEqual(
    evaluateCoverage({ total: { lines: { covered: 90, total: 100, pct: 1 } } }, workspace()),
    { covered: 90, total: 100, percentage: 90, minimum: 90, passes: true },
  );
  assert.equal(
    evaluateCoverage({ total: { lines: { covered: 869, total: 1000, pct: 100 } } }, workspace())
      .passes,
    false,
  );
});

test('rejects missing, partial, and inconsistent line summaries', () => {
  for (const summary of [
    {},
    { total: {} },
    { total: { lines: { covered: 1 } } },
    { total: { lines: { covered: 2, total: 1 } } },
    { total: { lines: { covered: 0, total: 0 } } },
  ]) {
    assert.throws(() => evaluateCoverage(summary, workspace()), /invalid or incomplete/);
  }
});

test('rejects a missing or invalid configured threshold', () => {
  assert.throws(
    () => evaluateCoverage({ total: { lines: { covered: 1, total: 1 } } }, {}),
    /no valid line coverage threshold/,
  );
  assert.throws(
    () => evaluateCoverage({ total: { lines: { covered: 1, total: 1 } } }, workspace(101)),
    /no valid line coverage threshold/,
  );
});

test('fails closed for missing and malformed input files', () => {
  assert.throws(
    () =>
      loadCoverage('missing.json', 'angular.json', () => {
        throw new Error('ENOENT');
      }),
    /missing or unreadable/,
  );
  const files = new Map([
    ['summary.json', '{'],
    ['angular.json', JSON.stringify(workspace())],
  ]);
  assert.throws(
    () => loadCoverage('summary.json', 'angular.json', (path) => files.get(path)),
    /not valid JSON/,
  );
});
