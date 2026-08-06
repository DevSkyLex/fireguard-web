---
paths:
  - 'src/app/**/*.ts'
  - 'src/app/**/*.html'
---

# Comments

**Documentation lives in the JSDoc block of a declaration. Nothing else is documentation.**

The mandated tags (`CLAUDE.md` rule 5) are the place to explain what a thing is for, what it owns, and any caveat a caller must know. If an explanation is worth writing, it is worth attaching to the declaration it explains — where a reader looking that thing up will actually find it.

## Banned

- **Free-floating `//` prose inside a body.** A paragraph between statements is not documentation; it is a JSDoc block that got lost.
- **Any comment inside an object or array literal** — route definitions, provider arrays, `imports:`, option sets, config objects. If a route or a provider needs explaining, the explanation belongs in the JSDoc of the `const` that holds it.
- **`<!-- -->` prose in a template.** Templates carry no rationale. A layout, an accessibility choice, or a CSS workaround is explained in the component's `@description`, not beside the element.
- **Multi-line `//` blocks anywhere.** Two or more consecutive comment lines mean the text wanted to be a doc block. Move it.
- **Section-narrating comments** — `// Build the payload`, `// Now handle the error`. The code says that.

## The one exception

A **single line**, on the statement it concerns, when that statement would otherwise read as a mistake and the reason cannot live on a declaration:

```typescript
input.value = ''; // Re-picking the same file fires no change event otherwise.
```

Workarounds for a browser or library quirk, a deliberate-looking-wrong line, an ordering constraint. If it takes two lines, it is not this exception — it belongs in the JSDoc.

`//#region` markers are structure, not comments, and stay.

## Where rationale goes instead

| Explaining…                                              | Goes in                                      |
| -------------------------------------------------------- | -------------------------------------------- |
| what a component/service/store is and why it exists here | its class `@description`                     |
| why a route is shaped that way                           | the `@description` of the `const … : Routes` |
| a template's layout or accessibility decision            | the component's `@description`               |
| why a property is derived that way                       | that property's `@description`               |
| an approved deviation from `ARCHITECTURE.md`             | the owning `FEATURE.md` (§14.2)              |

A `@description` still stays short — one or two sentences on purpose and the one non-obvious thing (§14.4). Moving prose out of the body is not permission to make the doc block an essay: if the explanation cannot be said briefly, it is design documentation and belongs in `FEATURE.md`.
