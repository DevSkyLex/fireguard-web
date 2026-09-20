import type { CallState } from '@core/request-state';
import type { InterventionTableSource } from '@features/organization/features/interventions/models';
import type {
  InterventionChangeOutput,
  InterventionChangeTableQuery,
  InterventionWorkItemTableQuery,
} from '@features/organization/features/interventions/models';
import type { InterventionWorkItemPage } from './intervention-work-item-page.interface';

/**
 * Interface InterventionTableQueryState
 * @interface InterventionTableQueryState
 * @description Page-owned criteria, request generations and visitation for Work and Changes.
 * @since 6.2.0
 */
export interface InterventionTableQueryState {
  readonly offline: boolean;
  readonly workItemsSource: InterventionTableSource;
  readonly changesSource: InterventionTableSource;
  readonly contextId: string | null;
  readonly activeTable: 'workItems' | 'changes' | null;
  readonly workItemsInterventionId: string | null;
  readonly workItemsCallState: CallState<InterventionWorkItemPage>;
  readonly workItemsQuery: InterventionWorkItemTableQuery;
  readonly workItemsGeneration: number;
  readonly workItemsVisited: boolean;
  readonly workItemsInvalidated: boolean;
  readonly changesInterventionId: string | null;
  readonly changesCallState: CallState<readonly InterventionChangeOutput[]>;
  readonly changesQuery: InterventionChangeTableQuery;
  readonly changesGeneration: number;
  readonly changesVisited: boolean;
  readonly changesInvalidated: boolean;
}
