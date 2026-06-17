#!/usr/bin/env node
/**
 * PreToolUse hook — block edits that violate FireGuard's hard architecture rules
 * before they happen.
 *
 * Denies (exit 2, message on stderr):
 *  - editing `src/styles.css` (styling must go through Tailwind utilities + PrimeNG `[pt]`)
 *  - creating files under a feature `models/` folder that look like runtime code
 *    (`*.util.ts`, `*.utils.ts`, `*.constants.ts`, `*.options.ts`, `*.service.ts`)
 *
 * Anything else is allowed (exit 0).
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
  process.stderr.write(`${message}\n`);
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

if (/\/src\/styles\.css$/.test(filePath)) {
  deny(
    'Blocked: src/styles.css is off-limits. Style via Tailwind utility classes and ' +
      'PrimeNG [pt] bindings instead (see ARCHITECTURE.md and PRODUCT.md).',
  );
}

if (/\/models\/.*\.(util|utils|constants|options|service)\.ts$/.test(filePath)) {
  deny(
    `Blocked: ${filePath} puts runtime code inside a models/ folder. models/ is ` +
      'type-only — move functions to utils/, fixed values to constants/, select ' +
      'sets to options/, services to data-access/services/ (ARCHITECTURE.md §9).',
  );
}

process.exit(0);
