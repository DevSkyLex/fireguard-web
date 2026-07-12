import type { MenuItem } from 'primeng/api';
import type { InterventionCommandAction } from '@features/organization/features/interventions/models';

/**
 * Interface InterventionHeaderState
 * @interface InterventionHeaderState
 *
 * @description
 * Header-action view state the intervention detail page pushes for the
 * layout's page-header action slot: the canonical phase action, the review
 * affordance, prev/next navigation state and the overflow menu entries.
 *
 * @since 1.0.0
 */
export interface InterventionHeaderState {
  readonly commandAction: InterventionCommandAction | null;
  readonly canRequestChanges: boolean;
  readonly listPosition: string | null;
  readonly showPrevNext: boolean;
  readonly prevDisabled: boolean;
  readonly nextDisabled: boolean;
  readonly overflowItems: readonly MenuItem[];
}
