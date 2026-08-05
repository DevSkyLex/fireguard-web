import { InjectionToken } from '@angular/core';
import type { ExclusiveSlotContribution } from '@shared/layout-slot';

/**
 * Constant SPLIT_SHOWCASE_SLOT
 * @const SPLIT_SHOWCASE_SLOT
 *
 * @description
 * Mono-active slot for the branded left panel. The highest-priority active
 * contribution claims it; with none active the panel is not rendered at all and
 * the form column takes the full width.
 *
 * @since 1.0.0
 *
 * @type {InjectionToken<ExclusiveSlotContribution[]>}
 */
export const SPLIT_SHOWCASE_SLOT: InjectionToken<ExclusiveSlotContribution[]> = new InjectionToken<
  ExclusiveSlotContribution[]
>('SPLIT_SHOWCASE_SLOT');
