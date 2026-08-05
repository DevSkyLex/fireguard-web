#!/usr/bin/env node
/**
 * PreToolUse hook (fireguard-sso-web) — block clearly-unsafe or architecture-violating
 * writes before they happen. Deny = exit 2 with a message on stderr; everything else
 * = exit 0.
 *
 * Paths here are relative to the WEB app root, because this config is loaded when
 * `fireguard-sso-web/` is the workspace root. The monorepo-root guard carries the
 * same frontend rules with a `/fireguard-sso-web/` prefix, for sessions opened one
 * level up. Keep the two in sync when a rule changes.
 *
 * Denies:
 *  1. Secrets: any `.env*` (except the committed `.env.example`/`.env.dist`).
 *  2. Generated trees: `node_modules/`, `dist/`, `.angular/`, `test-results/`,
 *     `playwright-report/` — build outputs, edit the source instead.
 *  3. `src/styles.css` — style via Tailwind utilities (CLAUDE.md rule 3).
 *  4. Runtime code inside a `models/` folder — `models/` is type-only (ARCHITECTURE.md
 *     §10.10), with the sanctioned `<concept>-tag/` registry-resolver exception.
 *  5. `export * from` inside a barrel — a barrel is a public surface and takes explicit
 *     named re-exports (ARCHITECTURE.md §13.3).
 *
 * Intentionally conservative: it blocks only well-known, high-signal cases and never
 * blocks ordinary source edits, specs, or docs. In particular ARCHITECTURE.md and
 * FEATURE.md stay writable — §14.3 requires agents to update them in the same change.
 */
function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.on('data', (chunk) => (data += chunk));
    process.stdin.on('end', () => resolve(data));
    if (process.stdin.isTTY) resolve('');
  });
}

function deny(message) {
  process.stderr.write(`Blocked: ${message}\n`);
  process.exit(2);
}

const raw = await readStdin();
let payload = {};
try {
  payload = JSON.parse(raw || '{}');
} catch {
  process.exit(0);
}

const filePath = (payload?.tool_input?.file_path ?? payload?.tool_input?.filePath ?? '').replace(
  /\\/g,
  '/',
);
if (!filePath) process.exit(0);

// 1. Secrets.
const base = filePath.split('/').pop() ?? '';
const isExampleEnv = /^\.env\.(example|dist)$/.test(base);
if (/(^|\/)\.env(\.|$)/.test(filePath) && !isExampleEnv) {
  deny(
    `${filePath} looks like an environment/secret file. Do not write secrets. ` +
      'Document required variables in .env.example instead.',
  );
}

// 2. Generated trees.
const GENERATED = [
  ['/node_modules/', 'an npm dependency'],
  ['/dist/', 'a build output'],
  ['/.angular/', 'an Angular build cache'],
  ['/test-results/', 'a Playwright run artifact'],
  ['/playwright-report/', 'a Playwright report'],
];
for (const [seg, what] of GENERATED) {
  if (filePath.includes(seg)) {
    deny(
      `${filePath} is inside ${what} (${seg.replaceAll('/', '')}). Edit the source, not the output.`,
    );
  }
}

// 3. Global stylesheet — component rules only.
//
// The blanket ban is gone: spartan/ui keeps its theme in `src/styles.css` (the
// Tailwind layer order, the brain preset import, and the light/dark CSS custom
// properties `ng g @spartan-ng/cli:ui-theme` writes). Banning the file outright
// would ban the library's own installation.
//
// What the ban actually protected still holds, so it is now enforced narrowly:
// component styling belongs in Tailwind utility classes at the call site, never
// in a global selector. Theme tokens and at-rules stay allowed.
if (/(^|\/)src\/styles\.css$/.test(filePath)) {
  const body = String(payload?.tool_input?.content ?? payload?.tool_input?.new_string ?? '');
  // A declaration block opened by an element, class, id, or attribute selector.
  // `:root`, `@layer`, `@import`, `@theme`, `@custom-variant`, `@media` and the
  // `html`/`body` element rules the reset needs are all deliberately allowed.
  const componentRule = /^[ \t]*(?!html\b|body\b|:root\b|\*)[.#[a-zA-Z][^\n{}@]*\{/m;

  if (componentRule.test(body)) {
    deny(
      'src/styles.css takes the spartan/ui theme (layers, the brain preset import, and ' +
        'the light/dark custom properties) — not component rules. Style components with ' +
        'Tailwind utility classes at the call site (CLAUDE.md rule 3, ARCHITECTURE.md §8.5).',
    );
  }
}

// 4. models/ is type-only.
// Sanctioned exception (ARCHITECTURE.md §10.10): the presentation-registry resolver keeps
// the singular `.util.ts` suffix and lives directly in a `models/<concept>-tag/` folder
// (e.g. intervention-tag.util.ts, subscription-status-tag.util.ts).
const isTagRegistryResolver = /\/models\/[^/]+-tag\/[^/]+\.util\.ts$/.test(filePath);
if (
  /\/models\/.*\.(util|utils|constants|options|service)\.ts$/.test(filePath) &&
  !isTagRegistryResolver
) {
  deny(
    `${filePath} puts runtime code inside a models/ folder. models/ is type-only — ` +
      'move functions to utils/<name>/<name>.utils.ts, fixed values to constants/, ' +
      'select sets to options/, services to data-access/services/ (ARCHITECTURE.md ' +
      '§10.10, §10.13; sole exception: the <concept>-tag/ registry resolver, *.util.ts ' +
      'directly in a models/*-tag/ folder).',
  );
}

// 5. Barrels take explicit named re-exports.
const isBarrel = /(^|\/)src\/.*\/index\.ts$/.test(filePath);
const written = payload?.tool_input?.content ?? payload?.tool_input?.new_string ?? '';
if (isBarrel && /^\s*export\s+\*\s+from\s/m.test(written)) {
  deny(
    `${filePath} uses "export * from". A barrel is a public surface and takes explicit ` +
      'named re-exports — `export { X } from ...` and `export type { Y } from ...` — so ' +
      'that widening it is a deliberate act (ARCHITECTURE.md §13.3).',
  );
}

process.exit(0);
