import { Service } from '@angular/core';
import type { Observable } from 'rxjs';
import { HydraApiService } from '@core/api';
import type {
  InterventionTimeJournalOutput,
  InterventionTimeEntryOutput,
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
   * @returns {Observable<InterventionTimeJournalOutput>} Entries including correction history.
   */
  public journal(taskId: string): Observable<InterventionTimeJournalOutput> {
    return this.getOne<InterventionTimeJournalOutput>(
      `/api/intervention-work-items/${taskId}/time-entries`,
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
   * @returns {Observable<void>} Completion.
   */
  public cancelEntry(taskId: string, entryId: string, revision: number): Observable<void> {
    return this.delete(`/api/intervention-work-items/${taskId}/time-entries/${entryId}`, {
      headers: { 'If-Match': `"revision-${revision}"` },
    });
  }
}
