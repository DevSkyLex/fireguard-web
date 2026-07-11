import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { HydraApiService } from '@core/api';
import type { HydraCollection } from '@core/api/models';
import type {
  CreateInterventionLabelInput,
  InterventionLabelOutput,
  UpdateInterventionLabelInput,
} from '@features/organization/features/interventions/models';

/**
 * Service InterventionLabelService
 * @class InterventionLabelService
 * @extends {HydraApiService}
 *
 * @description
 * Owns the organization-scoped intervention label resource (CRUD). Labels are
 * embedded as `InterventionLabelSummary` on `InterventionOutput`; this
 * service manages the label catalog itself.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Injectable({ providedIn: 'root' })
export class InterventionLabelService extends HydraApiService {
  //#region Methods
  /**
   * Method list
   * @method list
   *
   * @description
   * Lists every label of one organization, sorted by name.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationIri - IRI of the owning organization.
   *
   * @return {Observable<HydraCollection<InterventionLabelOutput>>} Result of the list operation.
   */
  public list(organizationIri: string): Observable<HydraCollection<InterventionLabelOutput>> {
    return this.getCollection<InterventionLabelOutput>('/api/intervention-labels', {
      params: { organization: organizationIri },
    });
  }

  /**
   * Method create
   * @method create
   *
   * @description
   * Creates an intervention label. The API rejects a duplicate name within
   * the organization with a `409`.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {CreateInterventionLabelInput} input - input value.
   *
   * @return {Observable<InterventionLabelOutput>} Result of the create operation.
   */
  public create(input: CreateInterventionLabelInput): Observable<InterventionLabelOutput> {
    return this.post<CreateInterventionLabelInput, InterventionLabelOutput>(
      '/api/intervention-labels',
      input,
    );
  }

  /**
   * Method update
   * @method update
   *
   * @description
   * Merge-patches a label's name and/or colour.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} labelId - label Id value.
   * @param {UpdateInterventionLabelInput} input - input value.
   *
   * @return {Observable<InterventionLabelOutput>} Result of the update operation.
   */
  public update(
    labelId: string,
    input: UpdateInterventionLabelInput,
  ): Observable<InterventionLabelOutput> {
    return this.patch<UpdateInterventionLabelInput, InterventionLabelOutput>(
      `/api/intervention-labels/${labelId}`,
      input,
    );
  }

  /**
   * Method remove
   * @method remove
   *
   * @description
   * Deletes a label. Interventions referencing it keep their remaining
   * labels; the deleted one simply drops out of `labels`.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} labelId - label Id value.
   *
   * @return {Observable<void>} Result of the remove operation.
   */
  public remove(labelId: string): Observable<void> {
    return this.delete(`/api/intervention-labels/${labelId}`);
  }
  //#endregion
}
