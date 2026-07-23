import type { Type } from '@angular/core';

/**
 * Interface ConversationHeaderContribution
 * @interface ConversationHeaderContribution
 *
 * @description
 * A control contributed to the tool cluster on the right of the workspace
 * conversation header. The slot is additive: every contribution renders,
 * sorted by `order`.
 *
 * Contributions are shell-level affordances (assistant, theme, overflow menu,
 * info panel toggle), not page content — page-specific actions belong to
 * {@link PageHeaderContribution}.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface ConversationHeaderContribution {
  /** Stable identifier of the contribution. */
  readonly id: string;
  /** Sort key within the cluster; lower renders first. */
  readonly order: number;
  /** Component rendered in the slot. */
  readonly component: Type<unknown>;
}
