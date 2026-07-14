import type { CardPassThroughOptions } from 'primeng/card';

/**
 * Constant DATAVIEW_CARD_PT
 *
 * @description
 * Pass-through options giving the card wrapping a `p-dataview` a bordered,
 * flat, full-height panel appearance with a flush body and a tinted footer
 * strip for pagination controls. Shared verbatim by every organization
 * entity dataview (organizations, facility equipment, facility inspections).
 *
 * @since 1.0.0
 *
 * @type {CardPassThroughOptions}
 */
export const DATAVIEW_CARD_PT: CardPassThroughOptions = {
  root: {
    class:
      'h-full flex flex-col border border-surface-200 dark:border-surface-800 bg-surface-0 dark:bg-surface-900 shadow-none!',
  },
  body: {
    class: 'p-0! flex flex-col flex-1',
  },
  footer: {
    class:
      'border-t border-surface-200 dark:border-surface-800 bg-surface-50/10 dark:bg-surface-900/10 rounded-b-md',
  },
};
