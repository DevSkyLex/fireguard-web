# Code comments and JSDoc

This is the shared convention for human authors, Codex and Claude. Architecture
and feature contracts remain authoritative. Apply the same principles as the
backend: explain purpose and caller constraints, preserve verified metadata,
and keep the declaration titles and tag groups below. Oxfmt wraps prose; the
comment adapter preserves the project structure and executable source bytes.

## Content

Write English documentation on the declaration it explains. Start with a title
such as `Class Client`, `Property title`, `Method load` or `Function formatShortcut`.
Keep the title and optional declaration tags (`@class`, `@method`, `@readonly`,
etc.) in the first group. After a blank line, start prose on the `@description`
line and continue on following lines when needed. Use one or two sentences about
purpose, ownership or a non-obvious caller constraint. Keep the title separate;
do not merge it into the description or remove it.

Keep `//#region` markers. Do not add paragraphs between statements, comments
inside object/array literals, or `<!-- -->` rationale in templates. A single
inline line is allowed where a statement would otherwise read as a mistake.
Longer design rationale belongs in the owning `FEATURE.md`.

Preserve existing `@version`, `@since` and `@author` values. Do not invent historical
releases or authorship. Recover missing metadata from verified history or report
that it is unknown. Preserve directives, suppressions, examples and annotations
that affect tooling; review them separately from prose.

## Declaration contract

| Declaration                          | Tags                                                                                                                           |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| Class, component, directive, service | `@class`, `@description`, existing version/since and author metadata                                                           |
| Interface / type alias               | `@interface` / `@type`, `@description`, existing metadata; `@template` for generics                                            |
| Property, signal, input, output      | `@description`, `@type {DeclaredType}`, `@access`, existing `@since`, `@readonly` when applicable                              |
| Method / exported function           | `@description`, `@method` for methods, `@access`, existing `@since`, typed `@param` per parameter, `@returns` including `void` |
| Constructor                          | `@description`, `@constructor`, `@access`, existing `@since`, typed parameters when present                                    |

Keep parameter names, visibility and types aligned with the declaration. Explain
units, limits, nullability or ownership rather than repeating the type. Do not
change a signature, access modifier or type to satisfy a documentation check.

The required order is title/declaration tags, description, metadata, author
metadata, generic parameters, type, parameters, returns, then throws and other
annotations when present. Keep `@access`, existing `@version` and `@since`
together before parameters; order access before version/since. Separate authors,
parameters and returns with blank lines. Omit absent groups without inventing
metadata. Keep existing regions and declaration spacing.

The comment adapter protects titles while native Oxfmt formats prose, then
restores these groups. The profile uses multiline blocks, `@description`, no
automatic capitalization or default-value prose, and balanced wrapping that
preserves existing line breaks within the 100-character width. For example:

```typescript
/**
 * Function formatShortcut
 *
 * @description Formats a shortcut key with the
 * platform-specific modifier.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {ShortcutModifier} modifier - Platform modifier to display.
 * @param {string} key - Shortcut key, including punctuation such as `,`.
 *
 * @returns {string} Human-readable shortcut hint.
 */
```

## Progressive checks

The normal formatter keeps its existing scope. The dedicated comment tool uses
native Oxfmt formatting and Oxlint JSDoc rules, plus the existing declaration tag
checks. It checks complete changed authored TypeScript files, excluding specs,
declaration files and generated `shared/ui`. CI supplies the event's base commit;
locally the default is `HEAD` including staged, unstaged and untracked files.

```powershell
npm run docs:check -- src/app/core/interaction-capabilities/utils/shortcut-modifier/shortcut-modifier.utils.ts
npm run docs:fix -- src/app/core/interaction-capabilities/utils/shortcut-modifier/shortcut-modifier.utils.ts
npm run docs:check -- --base develop
npm run docs:test
```

Fixes require explicit files. They replace only JSDoc ranges, preserving executable
source bytes; no import sorting or whole-file rewrite is applied. The declaration
check rejects missing or mismatched titles; fixes do not invent a title. They do not
generate descriptions or historical metadata. Missing tags and inaccurate prose
need source-informed edits by the comment maintainer.

Migrate assigned files progressively. Review annotation semantics even when
executable code is unchanged. Formatting and documentation lint suffice for prose
alone; run type/build checks when annotations affecting compilation change.
Report actual checks and unrelated failures without broadening the assignment.
