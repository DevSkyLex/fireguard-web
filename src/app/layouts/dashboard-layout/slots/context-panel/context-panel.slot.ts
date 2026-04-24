import { InjectionToken } from '@angular/core';
import type { ContextPanelContribution } from './context-panel-contribution.interface';

/**
 * Constant CONTEXT_PANEL_SLOT
 * @const CONTEXT_PANEL_SLOT
 *
 * @description
 * Multi-provider injection token defining the dashboard secondary sidebar
 * extension point. Features register by declaring a
 * `{ provide: CONTEXT_PANEL_SLOT, useFactory: ..., multi: true }`
 * provider in their own `provideXxx()` function. The layout resolves the full
 * array and renders the highest-priority active contribution.
 *
 * @type {InjectionToken<ContextPanelContribution[]>}
 */
export const CONTEXT_PANEL_SLOT: InjectionToken<ContextPanelContribution[]> =
  new InjectionToken<ContextPanelContribution[]>(
    'CONTEXT_PANEL_SLOT',
  );
