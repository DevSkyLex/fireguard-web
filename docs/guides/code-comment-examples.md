# TypeScript comment examples

These examples complement [the shared convention](code-comments.md). Each sample
is independent. Release and author values illustrate the existing project format:
copy them into source only when its history verifies them. Keep useful existing
prose, examples, directives and analysis annotations.

## Useful tags

| Tag                         | Use when                                                                  |
| --------------------------- | ------------------------------------------------------------------------- |
| @class / @interface / @type | Identifying the actual class, interface or type alias.                    |
| @description                | Explaining purpose and caller constraints; the tag occupies its own line. |
| @access                     | Matching the declaration's public, protected or private visibility.       |
| @version / @since / @author | History verifies the metadata; preserve existing values.                  |
| @readonly / @static         | The declaration actually has that modifier.                               |
| @constructor / @method      | Identifying a constructor or method.                                      |
| @param                      | Documenting each parameter's type and meaningful role or constraint.      |
| @returns                    | Explaining the result, including void and Promise results.                |
| @throws                     | A documented failure is thrown synchronously; explain its condition.      |
| @template                   | The declaration actually defines a generic parameter.                     |
| @default                    | The source establishes a useful default value.                            |
| @see / @example             | A real reference or short example clarifies use.                          |
| @deprecated                 | A verified deprecation has a real replacement.                            |
| @internal                   | The declaration intentionally has a restricted caller contract.           |

Promise rejections belong in the description or returns contract. Do not claim
that an async rejection is a synchronous throw. Angular decorators, class
modifiers and TypeScript signatures stay unchanged during comment maintenance.

## Class, signals, constructor and method

```typescript
import { computed, signal, type Signal, type WritableSignal } from '@angular/core';

/**
 * Class CounterState
 * @class CounterState
 *
 * @description
 * Stores a non-negative count and exposes a derived empty-state signal.
 *
 * @access public
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export class CounterState {
  //#region Properties
  /**
   * Property value
   * @readonly
   *
   * @description
   * Writable count owned by this instance; callers change it through increment().
   *
   * @access private
   * @since 1.0.0
   *
   * @type {WritableSignal<number>}
   * @default 0
   */
  private readonly value: WritableSignal<number> = signal(0);

  /**
   * Property isEmpty
   * @readonly
   *
   * @description
   * Indicates whether the current count is zero.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  public readonly isEmpty: Signal<boolean> = computed(() => this.value() === 0);
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Initializes the count after validating its integer and non-negative constraints.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {number} [initial=0] - Initial non-negative integer count.
   *
   * @throws {RangeError} When the initial count is negative or not an integer.
   */
  public constructor(initial: number = 0) {
    if (!Number.isInteger(initial) || initial < 0) {
      throw new RangeError('The initial count must be a non-negative integer.');
    }

    this.value.set(initial);
  }
  //#endregion

  //#region Methods
  /**
   * Method increment
   * @method increment
   *
   * @description
   * Advances the count by one and returns the updated value.
   *
   * @access public
   * @since 1.0.0
   *
   * @returns {number} Count after the increment.
   */
  public increment(): number {
    this.value.update((value) => value + 1);
    return this.value();
  }
  //#endregion
}
```

The first member starts directly after its region marker. Separate subsequent
member docblocks with a blank line. Readonly describes the property binding; it
does not imply that a WritableSignal or a referenced object cannot change.

## Angular inputs and outputs

These members belong inside an existing component's properties group. Their
types describe the input/output wrappers as well as the transported values.

```typescript
/**
 * Property disabled
 * @readonly
 *
 * @description
 * Prevents the component's user-triggered action while preserving its rendered state.
 *
 * @access public
 * @since 1.0.0
 *
 * @type {InputSignal<boolean>}
 * @default false
 */
public readonly disabled: InputSignal<boolean> = input(false);

/**
 * Property confirmed
 * @readonly
 *
 * @description
 * Emits the selected identifier when the user confirms the action.
 *
 * @access public
 * @since 1.0.0
 *
 * @type {OutputEmitterRef<string>}
 */
public readonly confirmed: OutputEmitterRef<string> = output<string>();
```

## Named interface, members and generics

```typescript
/**
 * Interface PageResult
 * @interface PageResult
 *
 * @description
 * Carries one page of items and the total number of matching records.
 *
 * @access public
 * @since 1.0.0
 *
 * @template TItem - Item contract returned by the collection.
 */
export interface PageResult<TItem> {
  /**
   * Property items
   * @readonly
   *
   * @description
   * Items belonging to this page, in the requested order.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {readonly TItem[]}
   */
  readonly items: readonly TItem[];

  /**
   * Property total
   * @readonly
   *
   * @description
   * Number of records matching the query across all pages.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {number}
   */
  readonly total: number;
}
```

Document members of named interfaces and direct members of named type aliases.
Do not add docblocks inside anonymous generic arguments, signal value shapes,
function parameters, return shapes or nested shapes.

## Type alias and constant

```typescript
/**
 * Type ShortcutModifier
 *
 * @description
 * Modifier label selected for the current keyboard platform.
 *
 * @access public
 * @since 1.0.0
 *
 * @type {'Control' | 'Command'}
 */
export type ShortcutModifier = 'Control' | 'Command';

/**
 * Constant DEFAULT_PAGE_SIZE
 *
 * @description
 * Number of records requested when the collection has no explicit page-size selection.
 *
 * @access public
 * @since 1.0.0
 *
 * @type {number}
 */
export const DEFAULT_PAGE_SIZE: number = 30;
```

## Function

```typescript
/**
 * Function formatShortcut
 *
 * @description
 * Formats a shortcut hint using the current platform's modifier label.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {ShortcutModifier} modifier - Platform modifier displayed in the hint.
 * @param {string} key - Shortcut key, including punctuation such as a comma.
 *
 * @returns {string} Human-readable shortcut hint.
 */
export function formatShortcut(modifier: ShortcutModifier, key: string): string {
  return modifier + ' + ' + key;
}
```

A named arrow function can also use a Function title. Document the enclosing
declaration; do not insert additional blocks inside its anonymous parameter shape.

## Enum values and switch cases

Use an Enum title for an actual enum and document its named values when that enum
is part of the authored source. For a constant object used as a value catalogue,
document the enclosing constant and its named contract. Do not add paragraphs
inside its runtime object literal. A switch arm needs at most a short rationale
when its behavior is surprising; it does not receive a declaration docblock.

## Async methods and failure conditions

```typescript
/**
 * Method refresh
 * @method refresh
 *
 * @description
 * Replaces the cached page only after the load succeeds. The returned promise
 * rejects with the loader's error and leaves the previous page available.
 *
 * @access public
 * @since 1.0.0
 *
 * @returns {Promise<void>} Completion after the cache has been updated.
 *
 * @see PageResult
 */
```

Use @throws for an actual synchronous validation failure, as in the constructor
example. Preserve generic return types and explain partial results, cancellation
or retry guarantees only when the source contract establishes them.

## Deprecation and internal boundaries

Keep the normal title, description, visibility, parameters and returns. Add
@deprecated with a verified release and actual replacement, or @internal with an
explicit supported-caller boundary. Neither tag replaces the normal documentation.

## Final quality check

- Check the prose against the implementation and caller contract.
- Match visibility, names, types, optional values, defaults and failure conditions.
- Retain useful historical descriptions, metadata, examples and analysis directives.
- Use one docblock per declaration, outside anonymous shapes and runtime objects.
- Remove duplicate or empty regions and preserve declaration order.
- Separate members with a blank line, except the first in a class or region.
- Run scoped checks, verify formatter idempotence and compare executable tokens.
