import { Service } from '@angular/core';
import type { Observable } from 'rxjs';
import { HydraApiService } from '@core/api';
import type { HydraCollection } from '@core/api/models';
import type {
  CreateInterventionRecurrenceInput,
  InterventionRecurrenceListOptions,
  InterventionRecurrenceOutput,
  UpdateInterventionRecurrenceInput,
} from '@features/organization/features/interventions/models';

/** `Date` → the ATOM-with-seconds format the backend's `Assert\DateTime` expects. */
const toSecondsUtc = (date: Date): string => `${date.toISOString().slice(0, 19)}Z`;

/**
 * Service InterventionRecurrenceService
 * @class InterventionRecurrenceService
 * @extends {HydraApiService}
 *
 * @description
 * Owns the organization-scoped recurring intervention schedule resource
 * (CRUD, `/api/intervention-recurrences`). `nextOccurrenceAt` on every
 * response is authoritative and server-computed — this service never
 * derives it.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Service()
export class InterventionRecurrenceService extends HydraApiService {
  //#region Methods
  /**
   * Method list
   * @method list
   *
   * @description
   * Lists an organization's recurrences. There is no `template` filter — the
   * server does not support one.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationIri - IRI of the owning organization.
   * @param {InterventionRecurrenceListOptions} [options] - Optional active-state filter and pagination.
   *
   * @return {Observable<HydraCollection<InterventionRecurrenceOutput>>} Result of the list operation.
   */
  public list(
    organizationIri: string,
    options?: InterventionRecurrenceListOptions,
  ): Observable<HydraCollection<InterventionRecurrenceOutput>> {
    return this.getCollection<InterventionRecurrenceOutput>('/api/intervention-recurrences', {
      page: options?.page,
      itemsPerPage: options?.itemsPerPage,
      params: {
        organization: organizationIri,
        ...(options?.isActive !== undefined ? { isActive: options.isActive } : {}),
      },
    });
  }

  /**
   * Method get
   * @method get
   *
   * @description Reads one recurrence.
   * @access public
   * @since 1.0.0
   * @param {string} recurrenceId - recurrence Id value.
   * @return {Observable<InterventionRecurrenceOutput>} Result of the get operation.
   */
  public get(recurrenceId: string): Observable<InterventionRecurrenceOutput> {
    return this.getOne<InterventionRecurrenceOutput>(
      `/api/intervention-recurrences/${recurrenceId}`,
    );
  }

  /**
   * Method create
   * @method create
   *
   * @description Creates a recurrence. `organization` and `template` become immutable.
   * @access public
   * @since 1.0.0
   * @param {CreateInterventionRecurrenceInput} input - input value.
   * @return {Observable<InterventionRecurrenceOutput>} Result of the create operation.
   */
  public create(
    input: CreateInterventionRecurrenceInput,
  ): Observable<InterventionRecurrenceOutput> {
    const body: Record<string, unknown> = { ...input, anchorDate: toSecondsUtc(input.anchorDate) };
    if (input.endAt) body['endAt'] = toSecondsUtc(input.endAt);

    return this.post<Record<string, unknown>, InterventionRecurrenceOutput>(
      '/api/intervention-recurrences',
      body,
    );
  }

  /**
   * Method update
   * @method update
   *
   * @description
   * Merge-patches a recurrence. `isActive` is the pause/resume toggle's write
   * path. The response's `nextOccurrenceAt` is authoritative — treat it as
   * truth, never recompute it client-side.
   *
   * @access public
   * @since 1.0.0
   * @param {string} recurrenceId - recurrence Id value.
   * @param {UpdateInterventionRecurrenceInput} input - input value.
   * @return {Observable<InterventionRecurrenceOutput>} Result of the update operation.
   */
  public update(
    recurrenceId: string,
    input: UpdateInterventionRecurrenceInput,
  ): Observable<InterventionRecurrenceOutput> {
    const body: Record<string, unknown> = { ...input };
    if ('anchorDate' in input)
      body['anchorDate'] = input.anchorDate ? toSecondsUtc(input.anchorDate) : null;
    if ('endAt' in input) body['endAt'] = input.endAt ? toSecondsUtc(input.endAt) : null;

    return this.patch<Record<string, unknown>, InterventionRecurrenceOutput>(
      `/api/intervention-recurrences/${recurrenceId}`,
      body,
    );
  }

  /**
   * Method remove
   * @method remove
   *
   * @description Deletes a recurrence. Already-materialized interventions are unaffected — the reverse link does not exist.
   * @access public
   * @since 1.0.0
   * @param {string} recurrenceId - recurrence Id value.
   * @return {Observable<void>} Result of the remove operation.
   */
  public remove(recurrenceId: string): Observable<void> {
    return this.delete(`/api/intervention-recurrences/${recurrenceId}`);
  }
  //#endregion
}
