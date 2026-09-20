import { inject, Service } from '@angular/core';
import type {
  InterventionTimeDraft,
  InterventionTimeEntry,
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
   *
   * @access public
   * @since 1.0.0
   *
   * @param {InterventionTimeRecord} record - Scoped authorized snapshot.
   * @param {string | null} owner - Account captured before the request began.
   * @returns {Promise<void>}
   */
  public async saveJournal(record: InterventionTimeRecord, owner: string | null): Promise<void> {
    if (!owner || this.database.currentOwnerId() !== owner) return;
    await this.database.ensureOwnerBound();
    if (this.database.currentOwnerId() !== owner) return;
    await this.database.put('timeJournals', record.workItemId, record);
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
   * @returns {Promise<void>}
   */
  public async clearDraft(workItemId: string, owner: string | null): Promise<void> {
    if (!owner || this.database.currentOwnerId() !== owner) return;
    await this.database.ensureOwnerBound();
    if (this.database.currentOwnerId() !== owner) return;
    await this.database.remove('timeDrafts', workItemId);
  }
}
