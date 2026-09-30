import type { CallState } from '@core/request-state';
import type {
  InterventionTableSource,
  InterventionChangeOutput,
  InterventionChangeTableQuery,
  InterventionWorkItemTableQuery,
} from '@features/organization/features/interventions/models';
import type { InterventionWorkItemPage } from './intervention-work-item-page.interface';

/**
 * Interface InterventionTableQueryState
 * @interface InterventionTableQueryState
 *
 * @description
 * Page-owned criteria, request generations and visitation for Work and Changes.
 *
 * @since 6.2.0
 */
export interface InterventionTableQueryState {
  /**
   * Property offline
   * @readonly
   *
   * @description
   * Indicates whether linked-resource queries are paused because the client is offline.
   *
   * @access public
   *
   * @type {boolean}
   */
  readonly offline: boolean;

  /**
   * Property workItemsSource
   * @readonly
   *
   * @description
   * Identifies the source of the current work-item rows.
   *
   * @access public
   *
   * @type {InterventionTableSource}
   */
  readonly workItemsSource: InterventionTableSource;

  /**
   * Property changesSource
   * @readonly
   *
   * @description
   * Identifies the source of the current change rows.
   *
   * @access public
   *
   * @type {InterventionTableSource}
   */
  readonly changesSource: InterventionTableSource;

  /**
   * Property contextId
   * @readonly
   *
   * @description
   * Identifies the context associated with this intervention table.
   *
   * @access public
   *
   * @type {string | null}
   */
  readonly contextId: string | null;

  /**
   * Property activeTable
   * @readonly
   *
   * @description
   * Selects whether work items or changes are shown in the intervention table.
   *
   * @access public
   *
   * @type {'workItems' | 'changes' | null}
   */
  readonly activeTable: 'workItems' | 'changes' | null;

  /**
   * Property workItemsInterventionId
   * @readonly
   *
   * @description
   * Identifies the work items intervention associated with this intervention table.
   *
   * @access public
   *
   * @type {string | null}
   */
  readonly workItemsInterventionId: string | null;

  /**
   * Property workItemsCallState
   * @readonly
   *
   * @description
   * Tracks the request state for work items.
   *
   * @access public
   *
   * @type {CallState<InterventionWorkItemPage>}
   */
  readonly workItemsCallState: CallState<InterventionWorkItemPage>;

  /**
   * Property workItemsQuery
   * @readonly
   *
   * @description
   * Stores the current work-item table filters and page selection.
   *
   * @access public
   *
   * @type {InterventionWorkItemTableQuery}
   */
  readonly workItemsQuery: InterventionWorkItemTableQuery;

  /**
   * Property workItemsGeneration
   * @readonly
   *
   * @description
   * Fences stale work-item responses from replacing newer query state.
   *
   * @access public
   *
   * @type {number}
   */
  readonly workItemsGeneration: number;

  /**
   * Property workItemsVisited
   * @readonly
   *
   * @description
   * Indicates whether the work-item table has been opened in this workspace.
   *
   * @access public
   *
   * @type {boolean}
   */
  readonly workItemsVisited: boolean;

  /**
   * Property workItemsInvalidated
   * @readonly
   *
   * @description
   * Indicates whether the work-item table needs to be refreshed.
   *
   * @access public
   *
   * @type {boolean}
   */
  readonly workItemsInvalidated: boolean;

  /**
   * Property changesInterventionId
   * @readonly
   *
   * @description
   * Identifies the changes intervention associated with this intervention table.
   *
   * @access public
   *
   * @type {string | null}
   */
  readonly changesInterventionId: string | null;

  /**
   * Property changesCallState
   * @readonly
   *
   * @description
   * Tracks the request state for changes.
   *
   * @access public
   *
   * @type {CallState<readonly InterventionChangeOutput[]>}
   */
  readonly changesCallState: CallState<readonly InterventionChangeOutput[]>;

  /**
   * Property changesQuery
   * @readonly
   *
   * @description
   * Stores the current change table filters and page selection.
   *
   * @access public
   *
   * @type {InterventionChangeTableQuery}
   */
  readonly changesQuery: InterventionChangeTableQuery;

  /**
   * Property changesGeneration
   * @readonly
   *
   * @description
   * Fences stale change responses from replacing newer query state.
   *
   * @access public
   *
   * @type {number}
   */
  readonly changesGeneration: number;

  /**
   * Property changesVisited
   * @readonly
   *
   * @description
   * Indicates whether the change table has been opened in this workspace.
   *
   * @access public
   *
   * @type {boolean}
   */
  readonly changesVisited: boolean;

  /**
   * Property changesInvalidated
   * @readonly
   *
   * @description
   * Indicates whether the change table needs to be refreshed.
   *
   * @access public
   *
   * @type {boolean}
   */
  readonly changesInvalidated: boolean;
}
