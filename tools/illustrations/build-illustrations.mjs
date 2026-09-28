#!/usr/bin/env node
/**
 * Builds the isometric illustration catalogs served from `public/assets/illustrations/`:
 *
 * - `resources/`: one artwork per domain resource, rendered by `ResourceIllustration`;
 * - `empty-states/`: generic situations (search miss, access denied, all clear…),
 *   rendered by `StateIllustration`.
 *
 * Every artwork ships a light and a dark variant tuned to the theme tokens of
 * `src/styles.css`, and each folder gets its `catalog.json`. The visual language is
 * normative in DESIGN.md: one true isometric, hairline contours on near-background faces,
 * dotted inner edges, Lucide pictograms engraved in their face, monochrome with a single light.
 * Scenes are composed from `lib/kit.mjs`; pictograms come from `@ng-icons/lucide`.
 *
 * Run `node tools/illustrations/build-illustrations.mjs` after changing a scene or the
 * palette; `--check` exits non-zero when the committed assets differ from a fresh build.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { emit } from './lib/svg.mjs';
import { RESOURCES } from './scenes/resources.mjs';
import { STATES } from './scenes/states.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUTPUT = resolve(HERE, '../../public/assets/illustrations');
const THEMES = ['light', 'dark'];

const CATALOGS = [
  { dir: 'resources', key: 'resources', token: '{resource}', scope: 'fg', scenes: RESOURCES },
  { dir: 'empty-states', key: 'states', token: '{state}', scope: 'fg-state', scenes: STATES },
];

/**
 * Renders every file of one catalog in memory.
 *
 * @param {(typeof CATALOGS)[number]} catalog
 * @returns {Array<[string, string]>} Pairs of path relative to the output folder and content.
 */
function render({ dir, key, token, scope, scenes }) {
  const names = Object.keys(scenes);
  const files = [];
  for (const theme of THEMES) {
    for (const name of names) {
      const { title, desc, fn } = scenes[name];
      files.push([
        join(dir, theme, `${name}.svg`),
        emit(fn(), theme, `${scope}-${name}`, title, desc),
      ]);
    }
  }
  const manifest = {
    schemaVersion: 1,
    width: 400,
    height: 320,
    viewBox: '0 0 400 320',
    variants: { light: `light/${token}.svg`, dark: `dark/${token}.svg` },
    [key]: names,
  };
  files.push([join(dir, 'catalog.json'), `${JSON.stringify(manifest, null, 2)}\n`]);
  return files;
}

const check = process.argv.includes('--check');
const drift = [];
let written = 0;
for (const catalog of CATALOGS) {
  for (const [relative, content] of render(catalog)) {
    const path = join(OUTPUT, relative);
    if (check) {
      if (!existsSync(path) || readFileSync(path, 'utf8') !== content) drift.push(relative);
      continue;
    }
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
    written++;
  }
}

if (check) {
  for (const relative of drift) process.stderr.write(`Stale illustration: ${relative}\n`);
  if (drift.length) process.exitCode = 1;
  else process.stdout.write('Illustration catalogs are up to date.\n');
} else {
  process.stdout.write(`Wrote ${written} illustration files to public/assets/illustrations.\n`);
}
