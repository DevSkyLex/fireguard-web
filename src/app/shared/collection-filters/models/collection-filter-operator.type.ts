/**
 * Type CollectionFilterOperator
 *
 * @description
 * The full operator vocabulary a `CollectionFilterField` may draw from — the
 * generic comparison a chip's operator segment can express, independent of
 * any feature's models. A field declares which subset actually applies to it
 * through `CollectionFilterField.operators`; a feature's data-access layer
 * then maps whichever ones it exposes to real query params (`ARCHITECTURE.md`
 * §8.3 `data-access/`) — `shared/` models the vocabulary only, it never
 * decides which operator a given backend endpoint honours.
 *
 * - `equals` / `notEquals` — exact match, positive or negated.
 * - `contains` / `notContains` — substring match, positive or negated.
 * - `startsWith` / `endsWith` — anchored substring match.
 * - `greaterThan` / `lessThan` — one-sided ordering bound (numeric or date).
 * - `between` — a two-sided ordering bound.
 * - `isEmpty` / `isNotEmpty` — presence check; the value segment renders no
 *   control for these, since no value narrows a presence check further.
 * - `isAnyOf` / `isNoneOf` — set membership, positive or negated.
 *
 * @since 8.0.0
 */
export type CollectionFilterOperator =
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'notContains'
  | 'startsWith'
  | 'endsWith'
  | 'greaterThan'
  | 'lessThan'
  | 'between'
  | 'isEmpty'
  | 'isNotEmpty'
  | 'isAnyOf'
  | 'isNoneOf';
