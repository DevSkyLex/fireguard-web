import { InjectionToken } from '@angular/core';
import type { PanelContribution } from './panel-contribution.interface';

/**
 * Constant PANEL_SLOT
 * @const PANEL_SLOT
 *
 * @description
 * Provides the contextual right-hand panel slot.
 *
 * @since 1.0.0
 *
 * @type {InjectionToken<PanelContribution[]>}
 */
export const PANEL_SLOT: InjectionToken<PanelContribution[]> = new InjectionToken<
  PanelContribution[]
>('PANEL_SLOT');
