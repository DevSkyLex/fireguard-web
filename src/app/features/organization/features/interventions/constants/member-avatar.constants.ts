import type { AvatarPassThroughOptions } from 'primeng/avatar';

/**
 * Constant COMPACT_AVATAR_PT
 *
 * @description
 * Pass-through shrinking a `p-avatar` to the ~20px footprint used by the
 * intervention list, board cards and detail rail, since PrimeNG's own `normal`
 * size renders larger. A stacking ring separates overlapping avatars in both
 * themes.
 *
 * @since 3.1.0
 *
 * @type {AvatarPassThroughOptions}
 */
export const COMPACT_AVATAR_PT: AvatarPassThroughOptions = {
  root: {
    class:
      'size-6 text-xs font-medium ring-2 ring-surface-0 bg-surface-100 text-surface-600 dark:ring-surface-950 dark:bg-surface-800 dark:text-surface-300',
  },
};

/**
 * Constant MEMBER_AVATAR_MAX
 *
 * @description
 * How many avatars render before the stack collapses the rest into a `+N`
 * overflow avatar.
 *
 * @since 3.1.0
 *
 * @type {number}
 */
export const MEMBER_AVATAR_MAX: number = 3;
