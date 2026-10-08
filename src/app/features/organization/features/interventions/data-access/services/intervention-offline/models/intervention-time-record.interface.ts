import type {
  InterventionTimeDraft,
  InterventionTimeEntry,
  InterventionTimeJournalPage,
} from '@features/organization/features/interventions/models';

/**
 * Interface InterventionTimeRecord
 * @interface InterventionTimeRecord
 *
 * @description
 * Authorized server journal cached independently from the operational workspace.
 *
 * @since 1.0.0
 */
export interface InterventionTimeRecord {
  /**
   * Property interventionId
   * @readonly
   *
   * @description
   * Owning intervention.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly interventionId: string;

  /**
   * Property workItemId
   * @readonly
   *
   * @description
   * Task identifier and journal cache key.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly workItemId: string;

  /**
   * Property entries
   * @readonly
   *
   * @description
   * Last authorized server snapshot; pending changes stay in the outbox.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {readonly InterventionTimeEntry[]}
   */
  readonly entries: readonly InterventionTimeEntry[];

  /**
   * Property pagination
   * @readonly
   *
   * @description
   * Identifies a bounded cached page; absent only on legacy complete journal snapshots.
   *
   * @access public
   *
   * @type {Omit<InterventionTimeJournalPage, 'entries'>}
   */
  readonly pagination?: Omit<InterventionTimeJournalPage, 'entries'>;

  /**
   * Property audience
   * @readonly
   *
   * @description
   * Identifies broad manager pages or the beneficiary whose restricted page was authorized.
   *
   * @access public
   *
   * @type {string}
   */
  readonly audience?: string;
}

/**
 * Interface InterventionTimeDraftRecord
 * @interface InterventionTimeDraftRecord
 *
 * @description
 * Account-bound draft scoped to one task and entry.
 *
 * @since 1.0.0
 */
export interface InterventionTimeDraftRecord {
  /**
   * Property interventionId
   * @readonly
   *
   * @description
   * Owning intervention.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly interventionId: string;

  /**
   * Property workItemId
   * @readonly
   *
   * @description
   * Task being recorded.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly workItemId: string;

  /**
   * Property draft
   * @readonly
   *
   * @description
   * Unsaved input retained across navigation.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InterventionTimeDraft}
   */
  readonly draft: InterventionTimeDraft;
}
