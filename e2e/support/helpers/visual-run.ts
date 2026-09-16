import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Type VisualPass
 * @type VisualPass
 * @description The scenario selection, independent of the durable run directory name.
 * @since 1.0.0
 */
export type VisualPass = 'inspection' | 'confirmation';

/**
 * Function visualRun
 * @description Validates the independently selected pass and safe artifact directory name.
 * @access public
 * @since 1.0.0
 * @param {NodeJS.ProcessEnv} environment - Explicit overrides or current process settings.
 * @returns {{ pass: VisualPass; name: string; directory: string }} Validated run identity.
 */
export function visualRun(environment: NodeJS.ProcessEnv = process.env): {
  pass: VisualPass;
  name: string;
  directory: string;
} {
  const pass = environment['FG_VISUAL_PASS'] ?? 'inspection';
  if (pass !== 'inspection' && pass !== 'confirmation')
    throw new Error('FG_VISUAL_PASS must be inspection or confirmation.');
  const name = environment['FG_VISUAL_RUN'] ?? pass;
  if (!/^[a-zA-Z0-9_-]+$/.test(name))
    throw new Error('FG_VISUAL_RUN must be a simple directory name.');
  return {
    pass,
    name,
    directory: resolve('e2e/artifacts/mobile-visual-review/branch-review', name),
  };
}

/**
 * Function sourceFingerprint
 * @description Hashes authored application/harness inputs and records HEAD. Secret environment
 * files, dependency trees and generated evidence are excluded without reading their contents.
 * @access public
 * @since 1.0.0
 * @returns {{ revision: string; fingerprint: string; dirty: boolean; files: number; scope: string[] }} Source identity.
 */
export function sourceFingerprint(): {
  revision: string;
  fingerprint: string;
  dirty: boolean;
  files: number;
  scope: string[];
} {
  const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
  const scope = [
    'src/app',
    'src/main.ts',
    'src/main.server.ts',
    'src/index.html',
    'src/server.ts',
    'src/styles.css',
    'src/locale',
    'public',
    'e2e',
    'playwright*.ts',
    'angular.json',
    'package*.json',
    'tsconfig*.json',
    'DESIGN.md',
    'ARCHITECTURE.md',
  ];
  const files = [
    ...new Set(
      execFileSync(
        'git',
        ['ls-files', '-z', '--cached', '--others', '--exclude-standard', '--', ...scope],
        { cwd: root, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 },
      )
        .split('\0')
        .filter(Boolean),
    ),
  ]
    .filter(
      (path) => !/(^|\/)(artifacts|test-results[^/]*|playwright-report|node_modules)\//.test(path),
    )
    .filter((path) => !/(^|\/)(\.env[^/]*|environment[^/]*\.ts)$/.test(path))
    .toSorted();
  const hash = createHash('sha256');
  for (const path of files) {
    hash.update(`${path}\0`);
    try {
      hash.update(readFileSync(resolve(root, path)));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      hash.update('deleted');
    }
    hash.update('\0');
  }
  return {
    revision: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
    fingerprint: hash.digest('hex'),
    dirty:
      execFileSync('git', ['status', '--porcelain=v1', '--untracked-files=all'], {
        cwd: root,
        encoding: 'utf8',
        maxBuffer: 8 * 1024 * 1024,
      }).length > 0,
    files: files.length,
    scope,
  };
}
