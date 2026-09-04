# models / utils / constants / options

**`models/` is type-only.** Runtime code there is blocked by a PreToolUse hook. Exactly two exceptions (§10.10): the `<concept>-tag/` presentation registry, and a const-enum catalog whose type is derived from the const via `typeof`.

Everything else that emits runtime code goes to a sibling (§10.13):

| Unit               | Folder       | Suffix          | Layout                                       |
| ------------------ | ------------ | --------------- | -------------------------------------------- |
| pure **function**  | `utils/`     | `.utils.ts`     | **one folder per util** + its own `testing/` |
| fixed **value**    | `constants/` | `.constants.ts` | **flat**                                     |
| UI **choice list** | `options/`   | `.constants.ts` | **flat**                                     |

- **No `type` or `interface` may be declared in `utils/`, `constants/`, or `options/`** — that is a §16 anti-pattern. A util may _import_ the types it operates on.
- A `utils/<name>/` unit folder takes **no barrel of its own**. `utils/index.ts` re-exports `./<name>/<name>.utils` directly; a sibling imports `../<other>/<other>.utils` (§13.2).
- Utils are **pure**: no `inject()`, no HTTP, no store, no side effects, no argument mutation.
- `.utils.ts` is plural. The singular `.util.ts` is reserved for a `models/<concept>-tag/` registry resolver (§9.2).
- **Placement is the lowest scope covering all consumers** (§2.8). One consumer → that component's local folder. Pre-hoisting "in case" is an anti-pattern.
- **Rule of three** (§2.9): a second consumer justifies _lifting_ an existing unit; it does not justify _inventing_ a new abstraction.
- Domain enums are string-literal unions in `.type.ts` — **TypeScript `enum` is banned entirely** (§9.1).

Placement detail: `.codex/references/naming.md`.
