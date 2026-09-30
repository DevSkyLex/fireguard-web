import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach } from 'vitest';

const fixtures: string[] = [];
export function fixture(files: Record<string, string>): string {
  const root = mkdtempSync(path.join(tmpdir(), 'fireguard-architecture-'));
  fixtures.push(root);
  const config = {
    compilerOptions: {
      module: 'preserve',
      moduleResolution: 'bundler',
      paths: {
        '@features/*': ['./src/app/features/*'],
        '@core/*': ['./src/app/core/*'],
        '@shared/*': ['./src/app/shared/*'],
        '@custom/*': ['./src/app/features/*'],
        '@app': ['./src/app/index.ts'],
      },
    },
    include: ['src/**/*.ts'],
  };
  const contents = {
    'tsconfig.base.json': JSON.stringify(config),
    'tsconfig.json': '{"extends":"./tsconfig.base.json"}',
    ...files,
  };
  for (const [name, content] of Object.entries(contents)) {
    const target = path.resolve(root, name);
    if (!target.startsWith(root + path.sep)) throw new Error('Fixture path leaves its root.');
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, content);
  }
  return root;
}

afterEach(() => {
  for (const root of fixtures.splice(0)) {
    if (
      path.dirname(root) !== tmpdir() ||
      !path.basename(root).startsWith('fireguard-architecture-')
    )
      throw new Error('Unsafe fixture cleanup.');
    rmSync(root, { recursive: true, force: true });
  }
});
