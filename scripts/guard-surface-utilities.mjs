/**
 * Guard: `bg-surface-0` must always carry a `dark:` counterpart.
 *
 * PrimeNG's Aura preset binds the dark scheme's *foreground* to `surface.0`
 * (`text.color: '{surface.0}'`), so `--p-surface-0` is `#ffffff` in BOTH
 * schemes — by design, not by accident. `tailwindcss-primeui` bridges that
 * variable to the `bg-surface-0` utility, which therefore paints a WHITE block
 * in dark mode unless a `dark:bg-surface-*` is applied alongside it.
 *
 * Two consequences this guard exists to protect:
 *   - never "fix" `colorScheme.dark.surface[0]` in the preset — inverting it
 *     turns every piece of dark-mode body text and input text dark-on-dark,
 *     app-wide, and no unit test would catch it;
 *   - every `bg-surface-0` needs a same-class-string dark counterpart.
 *
 * The check is a lint, not a spec, because oxlint does not parse Angular HTML
 * templates and the rule has to see class strings in both `.html` and `.ts`.
 *
 * The unit of analysis is the individual quoted string, NOT a line window: a
 * window wide enough to span a multi-line `class="…"` is also wide enough to
 * pick up a neighbouring element's `dark:` class and wave the violation
 * through. One class list, one verdict.
 */
import { globSync, readFileSync } from 'node:fs';

const ROOT = 'src/app';
const OFFENDER = /(?<![\w:-])bg-surface-0(?![\w-])/;
const DARK_COUNTERPART = /dark:bg-surface-(?!0(?![\w-]))[\w-]+/;

/** Double-, single- and backtick-quoted spans, newlines included. */
const QUOTED = /"([^"]*)"|'([^']*)'|`([^`]*)`/gs;

const files = globSync(`${ROOT}/**/*.{html,ts}`);
const violations = [];

for (const file of files) {
  const source = readFileSync(file, 'utf8');
  if (!OFFENDER.test(source)) continue;

  for (const match of source.matchAll(QUOTED)) {
    const value = match[1] ?? match[2] ?? match[3] ?? '';
    if (!OFFENDER.test(value) || DARK_COUNTERPART.test(value)) continue;

    const line = source.slice(0, match.index).split('\n').length;
    violations.push(`${file}:${line}\n      ${value.replace(/\s+/g, ' ').trim().slice(0, 120)}`);
  }
}

if (violations.length > 0) {
  console.error(
    `\n${violations.length} unguarded \`bg-surface-0\` class list(s) — each needs a ` +
      `\`dark:bg-surface-*\` in the SAME class string, because --p-surface-0 is ` +
      `white in dark mode too (see this script's header):\n\n    ${violations.join('\n    ')}\n`,
  );
  process.exit(1);
}

console.log(`bg-surface-0 guard: OK (${files.length} files scanned).`);
