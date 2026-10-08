import { inject, Service } from '@angular/core';
import type {
  InterventionTimeDraft,
  InterventionTimeEntry,
  InterventionTimeScope,
  InterventionTimeJournalPage,
} from '@features/organization/features/interventions/models';
import { InterventionDatabaseService } from './intervention-database.service';
import type {
  InterventionTimeRecord,
  InterventionTimeDraftRecord,
} from './models/intervention-time-record.interface';

/**
 * Service InterventionTimeRepository
 * @class InterventionTimeRepository
 *
 * @description
 * Independent journal/draft stores. Operational refreshes never overwrite local time.
 * Expected account identity prevents late responses from being cached after an account switch.
 *
 * @version 1.0.0
 */
@Service()
export class InterventionTimeRepository {
  /**
   * Property database
   * @readonly
   *
   * @description
   * Account-bound persistence.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {InterventionDatabaseService}
   */
  private readonly database: InterventionDatabaseService = inject(InterventionDatabaseService);

  /**
   * Method readJournal
   * @method readJournal
   *
   * @description
   * Returns only the selected task's last authorized snapshot.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} interventionId - Owning intervention.
   * @param {string} workItemId - Task identifier.
   *
   * @returns {Promise<readonly InterventionTimeEntry[] | null>} Cached entries, or unknown.
   */
  public async readJournal(
    interventionId: string,
    workItemId: string,
  ): Promise<readonly InterventionTimeEntry[] | null> {
    const owner = this.database.currentOwnerId();
    if (!owner) return null;
    await this.database.ensureOwnerBound();
    const record = await this.database.get<InterventionTimeRecord>('timeJournals', workItemId);
    return this.database.currentOwnerId() === owner && record?.interventionId === interventionId
      ? record.entries
      : null;
  }

  /**
   * Method saveJournal
   * @method saveJournal
   *
   * @description
   * Saves server history without applying or consuming queued corrections.
   * Restricted pages must contain only their beneficiary's entries; partial filtering would
   * invalidate server counts and continuation.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {InterventionTimeRecord} record - Scoped authorized snapshot.
   * @param {string | null} owner - Account captured before the request began.
   *
   * @returns {Promise<void>}
   */
  public async saveJournal(record: InterventionTimeRecord, owner: string | null): Promise<void> {
    if (!owner || this.database.currentOwnerId() !== owner) return;
    await this.database.ensureOwnerBound();
    if (this.database.currentOwnerId() !== owner) return;
    if (record.pagination && !record.audience) return;
    if (
      record.pagination &&
      record.audience?.startsWith('member:') &&
      record.entries.some((entry) => `member:${entry.memberId}` !== record.audience)
    )
      throw new Error('The journal page contains entries outside its authorized audience.');
    const key = record.pagination
      ? `page:v2:${record.workItemId}:${record.audience}:${record.pagination.itemsPerPage}:${record.pagination.page}`
      : record.workItemId;
    await this.database.put(
      'timeJournals',
      key,
      record,
      () => this.database.currentOwnerId() === owner,
    );
  }

  /**
   * Method readJournalPage
   * @method readJournalPage
   *
   * @description
   * Reads one audience-bound page without overwriting or claiming a complete device snapshot.
   * Legacy complete journals remain readable only as the current beneficiary's filtered history.
   * Earlier page keys cannot prove that the request was beneficiary-restricted and are ignored.
   *
   * @access public
   * @since unreleased
   *
   * @param {InterventionTimeScope} scope - Current authorized task and beneficiary visibility.
   * @param {number} page - Positive requested journal page.
   * @param {number} itemsPerPage - Maximum rows on the requested page.
   *
   * @returns {Promise<InterventionTimeJournalPage | null>} Cached page or explicit unknown history.
   */
  public async readJournalPage(
    scope: InterventionTimeScope,
    page = 1,
    itemsPerPage = 30,
  ): Promise<InterventionTimeJournalPage | null> {
    const owner = this.database.currentOwnerId();
    if (!owner) return null;
    await this.database.ensureOwnerBound();
    if (this.database.currentOwnerId() !== owner) return null;
    const audience = scope.manageOthers === true ? 'all' : `member:${scope.actorId}`;
    const key = `page:v2:${scope.workItemId}:${audience}:${itemsPerPage}:${page}`;
    const record = await this.database.get<InterventionTimeRecord>('timeJournals', key);
    if (this.database.currentOwnerId() !== owner) return null;
    if (
      record?.interventionId === scope.interventionId &&
      record.workItemId === scope.workItemId &&
      record.audience === audience &&
      record.pagination?.page === page &&
      record.pagination.itemsPerPage === itemsPerPage
    )
      return scope.manageOthers !== true &&
        record.entries.some((entry) => entry.memberId !== scope.actorId)
        ? null
        : { ...record.pagination, entries: record.entries };
    if (scope.manageOthers === true) return null;
    const legacy = await this.database.get<InterventionTimeRecord>(
      'timeJournals',
      scope.workItemId,
    );
    if (
      this.database.currentOwnerId() !== owner ||
      legacy?.interventionId !== scope.interventionId ||
      legacy.pagination
    )
      return null;
    const entries = legacy.entries
      .filter((entry) => entry.memberId === scope.actorId)
      .toSorted(
        (left, right) =>
          right.workedOn.localeCompare(left.workedOn) || left.id.localeCompare(right.id),
      );
    if (page > 1 && (page - 1) * itemsPerPage >= entries.length) return null;
    return {
      page,
      itemsPerPage,
      totalItems: entries.length,
      nextPage: page * itemsPerPage < entries.length ? page + 1 : null,
      entries: Array.from(
        entries.slice((page - 1) * itemsPerPage, page * itemsPerPage),
        (entry) => ({
          ...entry,
          versions: entry.versions
            .filter((version) => version.revision === entry.revision)
            .slice(0, 1),
          totalVersions: entry.totalVersions ?? entry.revision,
          nextBeforeRevision:
            entry.nextBeforeRevision ?? (entry.revision > 1 ? entry.revision : null),
        }),
      ),
    };
  }

  /**
   * Method readDraft
   * @method readDraft
   *
   * @description
   * Reads the task's unfinished manual entry or correction.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} interventionId - Owning intervention.
   * @param {string} workItemId - Task identifier.
   *
   * @returns {Promise<InterventionTimeDraft | null>} Saved draft.
   */
  public async readDraft(
    interventionId: string,
    workItemId: string,
  ): Promise<InterventionTimeDraft | null> {
    const owner = this.database.currentOwnerId();
    if (!owner) return null;
    await this.database.ensureOwnerBound();
    const record = await this.database.get<InterventionTimeDraftRecord>('timeDrafts', workItemId);
    return this.database.currentOwnerId() === owner && record?.interventionId === interventionId
      ? record.draft
      : null;
  }

  /**
   * Method saveDraft
   * @method saveDraft
   *
   * @description
   * Preserves incomplete text input before it becomes a queued operation.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {InterventionTimeDraftRecord} record - Scoped draft.
   * @param {string | null} owner - Captured account.
   *
   * @returns {Promise<void>}
   */
  public async saveDraft(record: InterventionTimeDraftRecord, owner: string | null): Promise<void> {
    if (!owner || this.database.currentOwnerId() !== owner) return;
    await this.database.ensureOwnerBound();
    if (this.database.currentOwnerId() !== owner) return;
    await this.database.put('timeDrafts', record.workItemId, record);
  }

  /**
   * Method clearDraft
   * @method clearDraft
   *
   * @description
   * Removes only a successfully submitted or explicitly discarded draft.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} workItemId - Task identifier.
   * @param {string | null} owner - Captured account.
   *
   * @returns {Promise<void>}
   */
  public async clearDraft(workItemId: string, owner: string | null): Promise<void> {
    if (!owner || this.database.currentOwnerId() !== owner) return;
    await this.database.ensureOwnerBound();
    if (this.database.currentOwnerId() !== owner) return;
    await this.database.remove('timeDrafts', workItemId);
  }
}
