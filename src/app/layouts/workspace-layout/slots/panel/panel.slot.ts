import { InjectionToken } from '@angular/core';
import type { PanelContribution } from './panel-contribution.interface';

/**
 * Constant PANEL_SLOT
 * @const PANEL_SLOT
 *
 * @description
 * Multi-provider injection token collecting every contribution registered for
 * the workspace right-hand panel. Unlike the additive slots, at most one
 * contribution renders at a time.
 *
 * @since 1.0.0
 *
 * @type {InjectionToken<PanelContribution[]>}
 */
export const PANEL_SLOT: InjectionToken<PanelContribution[]> = new InjectionToken<
  PanelContribution[]
>('PANEL_SLOT');
