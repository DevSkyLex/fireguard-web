import { Service } from '@angular/core';
import type { Observable } from 'rxjs';
import { HydraApiService, type RequestOptions } from '@core/api';
import type { HydraCollection } from '@core/api/models';
import type {
  InstantiateInterventionTemplateInput,
  InterventionTemplateInstantiationOutput,
  InterventionTemplateOutput,
} from '@features/organization/features/interventions/models';

/** `Date` → the ATOM-with-seconds format the backend's `Assert\DateTime` expects. */
const toSecondsUtc = (date: Date): string => `${date.toISOString().slice(0, 19)}Z`;

/**
 * Service InterventionTemplateService
 * @class InterventionTemplateService
 * @extends {HydraApiService}
 *
 * @description
 * Owns the organization-scoped intervention template resource: listing the
 * catalog of reusable blueprints and instantiating one into a real
 * intervention draft.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Service()
export class InterventionTemplateService extends HydraApiService {
  //#region Methods
  /**
   * Method list
   * @method list
   *
   * @description
   * Lists the intervention templates of one organization, ordered by name.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationIri - IRI of the owning organization.
   * @param {object} [options] - Optional pagination and search filter.
   * @param {number} [options.page] - Page number.
   * @param {number} [options.itemsPerPage] - Items per page.
   * @param {string} [options.search] - Case-insensitive partial match on the template name.
   *
   * @return {Observable<HydraCollection<InterventionTemplateOutput>>} Result of the list operation.
   */
  public list(
    organizationIri: string,
    options?: { readonly page?: number; readonly itemsPerPage?: number; readonly search?: string },
  ): Observable<HydraCollection<InterventionTemplateOutput>> {
    const params: NonNullable<RequestOptions['params']> = { organization: organizationIri };

    if (options?.search) params['search'] = options.search;

    return this.getCollection<InterventionTemplateOutput>('/api/intervention-templates', {
      page: options?.page,
      itemsPerPage: options?.itemsPerPage,
      params,
    });
  }

  /**
   * Method instantiate
   * @method instantiate
   *
   * @description
   * Instantiates a template into a real intervention draft. `input`'s four
   * fields (`name`, `site`, `responsible`, `plannedStartAt`) each override
   * the template's own default when provided; omitted or `undefined` means
   * "use the template default". There is no `dueAt` override — the backend
   * always derives it from `plannedStartAt` and the template's duration.
   *
   * @access public
   * @since 1.1.0
   *
   * @param {string} templateId - The template to instantiate.
   * @param {InstantiateInterventionTemplateInput} [input] - Optional overrides.
   *
   * @return {Observable<InterventionTemplateInstantiationOutput>} Result of the instantiate operation.
   */
  public instantiate(
    templateId: string,
    input?: InstantiateInterventionTemplateInput,
  ): Observable<InterventionTemplateInstantiationOutput> {
    const body: Record<string, unknown> = { ...input };
    if (input?.plannedStartAt) body['plannedStartAt'] = toSecondsUtc(input.plannedStartAt);

    return this.post<Record<string, unknown>, InterventionTemplateInstantiationOutput>(
      `/api/intervention-templates/${templateId}/instantiate`,
      body,
    );
  }
  //#endregion
}
