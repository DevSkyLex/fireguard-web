import { InjectionToken } from '@angular/core';

/**
 * Constant SPLIT_LAYOUT_CONTENT_MAX_WIDTH
 * @const SPLIT_LAYOUT_CONTENT_MAX_WIDTH
 *
 * @description
 * Tailwind max-width utility class applied to the split layout content column.
 * Routes that render in {@link SplitLayout} can override it through
 * `provideSplitLayoutSlots({ contentMaxWidth: '…' })` to give a feature more (or
 * less) horizontal room without affecting sibling routes. Defaults to `max-w-3xl`,
 * the width shared by the auth pages.
 *
 * @since 1.0.0
 *
 * @type {InjectionToken<string>}
 */
export const SPLIT_LAYOUT_CONTENT_MAX_WIDTH: InjectionToken<string> = new InjectionToken<string>(
  'SPLIT_LAYOUT_CONTENT_MAX_WIDTH',
  { factory: (): string => 'max-w-3xl' },
);
