import type { CardPassThroughOptions } from 'primeng/card';

/**
 * Constant TABLE_CARD_SHELL_STYLE_CLASS
 *
 * @description
 * `styleClass` for the `p-card` shell wrapping a `p-table` grid: a bordered,
 * flat, full-height flex column that lets the table body scroll internally.
 * Shared verbatim by every feature entity table (sessions, trusted devices,
 * notifications, equipment, facilities, inspections, and their nested variants)
 * so the card shell reads identically across features.
 *
 * @since 1.0.0
 *
 * @type {string}
 */
export const TABLE_CARD_SHELL_STYLE_CLASS: string =
  'flex h-full min-h-0 flex-col overflow-hidden border border-surface-200 dark:border-surface-800';

/**
 * Constant TABLE_CARD_SHELL_PT
 *
 * @description
 * Pass-through options completing {@link TABLE_CARD_SHELL_STYLE_CLASS}: a
 * flush, flex-column `body`/`content` so the inner `p-table` fills the card,
 * and a bordered, responsive `header` row for the title and toolbar actions.
 *
 * @since 1.0.0
 *
 * @type {CardPassThroughOptions}
 */
export const TABLE_CARD_SHELL_PT: CardPassThroughOptions = {
  body: { class: 'flex min-h-0 flex-1 flex-col p-0' },
  content: { class: 'flex min-h-0 flex-1 flex-col p-0' },
  header: {
    class:
      'flex flex-col gap-4 border-b border-surface-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-surface-800',
  },
};
