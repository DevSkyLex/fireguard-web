import type { CardPassThroughOptions } from 'primeng/card';

/**
 * Constant TREND_CARD_PT
 *
 * @description
 * Pass-through shared by the dashboard trend cards: a full-height flex column
 * whose body and content stretch so the chart fills the remaining space, with
 * the header and footer carrying their own padding. Structural, not cosmetic —
 * without it the chart collapses instead of filling the card.
 *
 * @since 1.1.0
 *
 * @type {CardPassThroughOptions}
 */
export const TREND_CARD_PT: CardPassThroughOptions = {
  root: {
    class:
      'h-full flex flex-col gap-4 border border-surface-200 dark:border-surface-800 bg-surface-0 dark:bg-surface-900',
  },
  body: { class: 'p-0! flex flex-col flex-1' },
  content: { class: 'pb-4 flex-1 flex flex-col' },
  header: { class: 'px-4 pt-4' },
};
