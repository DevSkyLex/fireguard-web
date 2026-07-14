import type { TabListPassThrough, TabPanelsPassThrough, TabsPassThrough } from 'primeng/types/tabs';

/**
 * Constant DETAIL_TABS_PT
 *
 * @description
 * Pass-through options for the `p-tabs` root of an entity detail page tab
 * container: a flex column that fills the remaining page height. Shared
 * verbatim by every organization entity detail page (facility, equipment,
 * inspection).
 *
 * @since 1.0.0
 *
 * @type {TabsPassThrough}
 */
export const DETAIL_TABS_PT: TabsPassThrough = {
  root: {
    class: 'flex min-h-0 flex-1 flex-col',
  },
};

/**
 * Constant DETAIL_TAB_LIST_PT
 *
 * @description
 * Pass-through options for the `p-tablist` of an entity detail page tab
 * container: a rounded top edge on the scroll content and horizontal padding
 * on the tab strip. Shared verbatim by every organization entity detail page.
 *
 * @since 1.0.0
 *
 * @type {TabListPassThrough}
 */
export const DETAIL_TAB_LIST_PT: TabListPassThrough = {
  content: {
    class: 'rounded-t-md',
  },
  tabList: {
    class: 'px-4',
  },
};

/**
 * Constant DETAIL_TAB_PANELS_PT
 *
 * @description
 * Pass-through options for the `p-tabpanels` of an entity detail page tab
 * container: a scrollable, flush-padded flex-filling panel area. Shared
 * verbatim by every organization entity detail page.
 *
 * @since 1.0.0
 *
 * @type {TabPanelsPassThrough}
 */
export const DETAIL_TAB_PANELS_PT: TabPanelsPassThrough = {
  root: {
    class: 'min-h-0 flex-1 overflow-y-auto px-0 pt-6',
  },
};
