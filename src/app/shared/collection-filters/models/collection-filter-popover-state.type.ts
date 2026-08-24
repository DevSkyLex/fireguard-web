/**
 * Type CollectionFilterPopoverState
 *
 * @description
 * Whether a filter field's value-control popover (`CollectionFilterSelect`,
 * `CollectionFilterMultiSelect`) is currently open or closed. Owned by the
 * page — a freshly picked field opens itself, and the popover mirrors its own
 * dismissal back out so the page's pending-field memory stays honest.
 *
 * @since 1.0.0
 */
export type CollectionFilterPopoverState = 'open' | 'closed';
