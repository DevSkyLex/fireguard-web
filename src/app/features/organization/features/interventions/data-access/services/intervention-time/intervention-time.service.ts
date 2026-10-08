import { Service } from '@angular/core';
import type { Observable } from 'rxjs';
import { HydraApiService } from '@core/api';
import type {
  InterventionTimeJournalOutput,
  InterventionTimeEntryOutput,
  InterventionTimeEntryVersionsOutput,
  WriteInterventionTimeEntryInput,
} from '@features/organization/features/interventions/models';

/**
 * Service InterventionTimeService
 * @class InterventionTimeService
 *
 * @description
 * Versioned time ledger transport, separate from work-item operational mutations.
 *
 * @version 1.0.0
 */
@Service()
export class InterventionTimeService extends HydraApiService {
  /**
   * Method journal
   * @method journal
   *
   * @description
   * Reads the caller-authorized journal.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} taskId - Task identifier.
   * @param {number} page - Requested positive journal page.
   * @param {number} itemsPerPage - Bounded server page size.
   * @param {boolean} ownOnly - Restricts the journal to the caller even if management is granted.
   *
   * @returns {Observable<InterventionTimeJournalOutput>} One authorized page with current versions.
   */
  public journal(
    taskId: string,
    page = 1,
    itemsPerPage = 30,
    ownOnly = false,
  ): Observable<InterventionTimeJournalOutput> {
    return this.getOne<InterventionTimeJournalOutput>(
      `/api/intervention-work-items/${taskId}/time-entries`,
      { params: { page, itemsPerPage, ownOnly } },
    );
  }

  /**
   * Method getEntry
   * @method getEntry
   *
   * @description
   * Reads the current entry directly for explicit conflict review without scanning journal pages.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} taskId - Owning task.
   * @param {string} entryId - Authorized entry to review.
   *
   * @returns {Observable<InterventionTimeEntryOutput>} Bounded current entry projection.
   */
  public getEntry(taskId: string, entryId: string): Observable<InterventionTimeEntryOutput> {
    return this.getOne<InterventionTimeEntryOutput>(
      `/api/intervention-work-items/${taskId}/time-entries/${entryId}`,
    );
  }

  /**
   * Method versions
   * @method versions
   *
   * @description
   * Reads one immutable history page only when explicitly requested.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} taskId - Owning task.
   * @param {string} entryId - Authorized journal entry.
   * @param {number} beforeRevision - Exclusive cursor; omitted for newest revisions.
   * @param {number} itemsPerPage - Bounded history page size.
   *
   * @returns {Observable<InterventionTimeEntryVersionsOutput>} Authorized revision page.
   */
  public versions(
    taskId: string,
    entryId: string,
    beforeRevision?: number,
    itemsPerPage = 30,
  ): Observable<InterventionTimeEntryVersionsOutput> {
    return this.getOne<InterventionTimeEntryVersionsOutput>(
      `/api/intervention-work-items/${taskId}/time-entries/${entryId}/versions`,
      { params: { itemsPerPage, ...(beforeRevision === undefined ? {} : { beforeRevision }) } },
    );
  }

  /**
   * Method createEntry
   * @method createEntry
   *
   * @description
   * Records actual work using a stable idempotency identifier.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} taskId - Task identifier.
   * @param {WriteInterventionTimeEntryInput} input - Actual work.
   *
   * @returns {Observable<InterventionTimeEntryOutput>} Current entry.
   */
  public createEntry(
    taskId: string,
    input: WriteInterventionTimeEntryInput,
  ): Observable<InterventionTimeEntryOutput> {
    return this.post<WriteInterventionTimeEntryInput, InterventionTimeEntryOutput>(
      `/api/intervention-work-items/${taskId}/time-entries`,
      input,
    );
  }

  /**
   * Method correctEntry
   * @method correctEntry
   *
   * @description
   * Corrects an entry only at the reviewed journal revision.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} taskId - Task identifier.
   * @param {WriteInterventionTimeEntryInput} input - Corrected complete entry.
   * @param {number} revision - Previously read journal revision.
   *
   * @returns {Observable<InterventionTimeEntryOutput>} Corrected entry.
   */
  public correctEntry(
    taskId: string,
    input: WriteInterventionTimeEntryInput,
    revision: number,
  ): Observable<InterventionTimeEntryOutput> {
    return this.patch<WriteInterventionTimeEntryInput, InterventionTimeEntryOutput>(
      `/api/intervention-work-items/${taskId}/time-entries/${input.id}`,
      input,
      { headers: { 'If-Match': `"revision-${revision}"` } },
    );
  }

  /**
   * Method cancelEntry
   * @method cancelEntry
   *
   * @description
   * Cancels an entry without deleting its history.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} taskId - Task identifier.
   * @param {string} entryId - Entry identifier.
   * @param {number} revision - Previously read journal revision.
   *
   * @returns {Observable<void>} Completion.
   */
  public cancelEntry(taskId: string, entryId: string, revision: number): Observable<void> {
    return this.delete(`/api/intervention-work-items/${taskId}/time-entries/${entryId}`, {
      headers: { 'If-Match': `"revision-${revision}"` },
    });
  }
}
