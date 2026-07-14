import type { DrawerPassThroughOptions } from 'primeng/drawer';

/**
 * Constant INTERVENTION_DRAWER_PT
 *
 * @description
 * Pass-through options sizing a right-anchored intervention drawer responsively:
 * full width on mobile, a compact 34rem panel from `sm` up. Shared verbatim by
 * every intervention drawer that uses this default width (skip, discovery,
 * work item, request changes); the edit and create drawers intentionally use a
 * wider panel and keep their own pass-through options.
 *
 * @since 1.0.0
 *
 * @type {DrawerPassThroughOptions}
 */
export const INTERVENTION_DRAWER_PT: DrawerPassThroughOptions = {
  root: { class: '!w-full sm:!w-[34rem]' },
};
