# Comments

**Documentation lives in the JSDoc block of a declaration. Nothing else is documentation.**

The structured tags below apply alongside `ARCHITECTURE.md` §14.4. Explain what a
declaration is for, what it owns and any caveat its caller must know in its own
doc block, where a reader looking that declaration up will find it.

## Required doc-block format

**Keep the application's structured doc blocks.** A short `/** One sentence. */`
does not replace the tagged block of a component, directive, model, property or
method. Concise prose means a concise `@description`, not omitted tags. This also
applies to new shared abstractions and code extracted from a feature.

Before editing, inspect a maintained component and the matching declaration kind
nearby. Preserve their English wording, heading/tag order and `//#region` sections.
Legacy shorthand comments are not the format to copy for new declarations.

| Declaration                        | Block heading and tags                                                                                                                                          |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Component / directive / service    | `Component Name` / `Directive Name` / `Service Name`, `@class`, `@description`, existing version/since and author conventions                                   |
| Interface / type                   | `Interface Name` / `Type Name`, `@interface` / `@type`, `@description`, version/since and generic `@template` tags where relevant                               |
| Property / signal / input / output | `Property name`, `@readonly` when applicable, `@description`, `@access`, `@since`, `@type {DeclaredType}`                                                       |
| Method / function                  | `Method name` / `Function name`, `@method` when applicable, `@description`, `@access`, `@since`, typed `@param` for each parameter, `@returns` including `void` |
| Constructor                        | `Constructor`, `@constructor`, `@description`, `@access`, `@since`, typed parameters when present                                                               |

Preserve existing version and author metadata when refactoring. Do not invent
historical versions or authorship. Keep parameter names and types aligned with the
declaration; add `@static` and `@template` when they describe the API.

```typescript
/**
 * Property columns
 * @readonly
 *
 * @description
 * Ordered columns and cards; the caller owns grouping.
 *
 * @access public
 * @since 1.0.0
 *
 * @type {InputSignal<readonly BoardColumn<T, K>[]>}
 */
```

```typescript
/**
 * Method scrollColumns
 * @method scrollColumns
 *
 * @description
 * Advances by whole columns while respecting reduced-motion preferences.
 *
 * @access protected
 * @since 1.0.0
 *
 * @param {-1 | 1} direction - Earlier (-1) or later (1) columns.
 * @returns {void}
 */
```

Before delivery, check each added or changed declaration's doc block against this
format. For documentation-only edits, formatting and a comparison of TypeScript
tokens with comments/trivia excluded can verify that executable code is unchanged.

## Required doc-block format

**Keep the application's structured doc blocks.** A short `/** One sentence. */`
does not replace the tagged block of a component, directive, model, property or
method. Concise prose means a concise `@description`, not omitted tags. This also
applies to new shared abstractions and code extracted from a feature.

Before editing, inspect a maintained component and the matching declaration kind
nearby. Preserve their English wording, heading/tag order and `//#region` sections.
Legacy shorthand comments are not the format to copy for new declarations.

| Declaration                        | Block heading and tags                                                                                                                                          |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Component / directive / service    | `Component Name` / `Directive Name` / `Service Name`, `@class`, `@description`, existing version/since and author conventions                                   |
| Interface / type                   | `Interface Name` / `Type Name`, `@interface` / `@type`, `@description`, version/since and generic `@template` tags where relevant                               |
| Property / signal / input / output | `Property name`, `@readonly` when applicable, `@description`, `@access`, `@since`, `@type {DeclaredType}`                                                       |
| Method / function                  | `Method name` / `Function name`, `@method` when applicable, `@description`, `@access`, `@since`, typed `@param` for each parameter, `@returns` including `void` |
| Constructor                        | `Constructor`, `@constructor`, `@description`, `@access`, `@since`, typed parameters when present                                                               |

Preserve existing version and author metadata when refactoring. Do not invent
historical versions or authorship. Keep parameter names and types aligned with the
declaration; add `@static` and `@template` when they describe the API.

```typescript
/**
 * Property columns
 * @readonly
 *
 * @description
 * Ordered columns and cards; the caller owns grouping.
 *
 * @access public
 * @since 1.0.0
 *
 * @type {InputSignal<readonly BoardColumn<T, K>[]>}
 */
```

```typescript
/**
 * Method scrollColumns
 * @method scrollColumns
 *
 * @description
 * Advances by whole columns while respecting reduced-motion preferences.
 *
 * @access protected
 * @since 1.0.0
 *
 * @param {-1 | 1} direction - Earlier (-1) or later (1) columns.
 * @returns {void}
 */
```

Before delivery, check each added or changed declaration's doc block against this
format. For documentation-only edits, formatting and a comparison of TypeScript
tokens with comments/trivia excluded can verify that executable code is unchanged.

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
