const { spawnSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const { readFileSync, readdirSync, writeFileSync } = require('node:fs');
const { resolve, relative } = require('node:path');
require('../scripts/register-typescript.cjs');
const { sourceFingerprint } = require('../support/helpers/visual-run.ts');

const root = resolve(__dirname, '../..');
process.chdir(root);
const source = sourceFingerprint();
const startedAt = new Date().toISOString();
const built = spawnSync(
  process.execPath,
  [resolve(root, 'node_modules/@angular/cli/bin/ng.js'), 'build', '--configuration=e2e-ssr'],
  { cwd: root, stdio: 'inherit', windowsHide: true },
);
if (built.error) throw built.error;
if (built.status !== 0) process.exit(built.status ?? 1);
const sourceEnd = sourceFingerprint();
const output = resolve(root, 'dist/fireguard-web-e2e-ssr');
const files = readdirSync(output, { recursive: true, withFileTypes: true })
  .filter((entry) => entry.isFile() && /\.(?:m?js|css|html)$/.test(entry.name))
  .map((entry) => resolve(entry.parentPath, entry.name))
  .toSorted();
const hash = createHash('sha256');
for (const file of files)
  hash.update(relative(output, file)).update('\0').update(readFileSync(file));
const metadata = {
  startedAt,
  completedAt: new Date().toISOString(),
  source,
  sourceEnd,
  sourceChanged: source.fingerprint !== sourceEnd.fingerprint,
  bundleFingerprint: hash.digest('hex'),
  bundleFiles: files.length,
};
writeFileSync(resolve(output, 'e2e-build.json'), JSON.stringify(metadata, null, 2));
if (metadata.sourceChanged) {
  process.stderr.write(
    'SSR build inputs changed during compilation; repeat after source is stable.\n',
  );
  process.exit(1);
}
