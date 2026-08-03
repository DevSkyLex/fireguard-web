import type {
  TabListPassThrough,
  TabPanelsPassThrough,
  TabPassThrough,
  TabsPassThrough,
} from 'primeng/types/tabs';

/**
 * Constant PANEL_TABS_PT
 *
 * @description
 * Makes the panel's tab strip a column that owns its own scroller.
 *
 * @since 1.0.0
 *
 * @type {TabsPassThrough}
 */
export const PANEL_TABS_PT: TabsPassThrough = {
  root: { class: 'flex min-h-0 flex-1 flex-col' },
};

/**
 * Constant PANEL_TAB_LIST_PT
 *
 * @description
 * Turns PrimeNG's underlined tab bar into the design's segmented pill: a
 * tinted track holding four equal buttons.
 *
 * This is the one place `[pt]` is doing real work in the panel, and it is
 * confined to it. The alternative — hand-rolling a `role="tablist"` — would
 * mean re-implementing roving tabindex and arrow-key navigation, which is
 * exactly what the component already gets right.
 *
 * @since 1.0.0
 *
 * @type {TabListPassThrough}
 */
export const PANEL_TAB_LIST_PT: TabListPassThrough = {
  // `!` on the backgrounds: PrimeNG injects its own styles after Tailwind's, so
  // at equal specificity `.p-tablist { background }` would win the tie.
  root: {
    class: 'mx-4 mt-3 shrink-0 rounded-lg border-0 bg-surface-100! p-1 dark:bg-surface-800!',
  },
  tabList: { class: 'gap-0.5 border-0 bg-transparent!' },
  // The ink bar belongs to the underlined variant; the pill marks the active
  // tab with its own background instead.
  activeBar: { class: 'hidden' },
};

/**
 * Constant PANEL_TAB_PT
 *
 * @description
 * One segment of the pill. The active state is expressed with the
 * `aria-selected:` variant rather than a function-valued passthrough, so every
 * class stays a literal Tailwind can see.
 *
 * @since 1.0.0
 *
 * @type {TabPassThrough}
 */
export const PANEL_TAB_PT: TabPassThrough = {
  root: {
    class:
      'flex-1 justify-center rounded-md border-0 bg-transparent px-3 py-1 text-sm font-medium text-surface-600 aria-selected:bg-surface-0 aria-selected:font-semibold aria-selected:text-surface-950 dark:text-surface-400 dark:aria-selected:bg-surface-900 dark:aria-selected:text-surface-50',
  },
};

/**
 * Constant PANEL_TAB_PANELS_PT
 *
 * @description
 * The tab body is the panel's scroller — the shell deliberately does not
 * scroll this column.
 *
 * @since 1.0.0
 *
 * @type {TabPanelsPassThrough}
 */
export const PANEL_TAB_PANELS_PT: TabPanelsPassThrough = {
  root: { class: 'min-h-0 flex-1 overflow-y-auto bg-transparent px-5 pt-2 pb-6' },
};
