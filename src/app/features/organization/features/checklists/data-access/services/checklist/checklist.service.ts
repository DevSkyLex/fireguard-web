import { Service } from '@angular/core';
import type { Observable } from 'rxjs';
import { HydraApiService, type RequestOptions } from '@core/api';
import type { HydraCollection } from '@core/api/models';
import type {
  ChecklistOutput,
  ChecklistListOptions,
  CreateChecklistInput,
  UpdateChecklistInput,
} from '@features/organization/features/checklists/models';

/**
 * Class ChecklistService
 * @class ChecklistService
 *
 * @description
 * API service for checklist template management.
 * Allows listing, getting, creating, and archiving
 * inspection checklist templates.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @extends {HydraApiService}
 */
@Service()
export class ChecklistService extends HydraApiService {
  //#region Properties
  /**
   * Property BASE_PATH
   * @readonly
   *
   * @description
   * Defines the organization API path used by checklist requests.
   *
   * @access private
   * @since 0.1.0
   *
   * @type {string}
   */
  private static readonly BASE_PATH: string = '/api/organizations';
  //#endregion

  //#region Methods
  /**
   * Method list
   * @method list
   *
   * @description
   * Retrieves a paginated list of checklist templates
   * defined for the given organization.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - The ID of the organization.
   * @param {RequestOptions} [options] - Optional pagination parameters.
   *
   * @returns {Observable<HydraCollection<ChecklistOutput>>} An observable emitting the checklists
   *   collection.
   */
  public list(
    organizationId: string,
    options?: ChecklistListOptions,
  ): Observable<HydraCollection<ChecklistOutput>> {
    const params: NonNullable<RequestOptions['params']> = {};

    if (options?.status) params['status'] = options.status;
    if (options?.search) params['search'] = options.search;
    if (options?.order) {
      for (const [field, direction] of Object.entries(options.order)) {
        params[`order[${field}]`] = direction;
      }
    }

    return this.getCollection<ChecklistOutput>(
      `${ChecklistService.BASE_PATH}/${organizationId}/checklists`,
      {
        page: options?.page,
        itemsPerPage: options?.itemsPerPage,
        params: params,
      },
    );
  }

  /**
   * Method get
   * @method get
   *
   * @description
   * Retrieves a single checklist template by its ID
   * within the given organization.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - The ID of the organization.
   * @param {string} checklistId - The ID of the checklist to retrieve.
   *
   * @returns {Observable<ChecklistOutput>} An observable emitting the checklist details.
   */
  public get(organizationId: string, checklistId: string): Observable<ChecklistOutput> {
    return this.getOne<ChecklistOutput>(
      `${ChecklistService.BASE_PATH}/${organizationId}/checklists/${checklistId}`,
    );
  }

  /**
   * Method create
   * @method create
   *
   * @description
   * Creates a new checklist template for the given organization,
   * including its items and associated version.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - The ID of the organization.
   * @param {CreateChecklistInput} input - The data required to create the checklist.
   *
   * @returns {Observable<ChecklistOutput>} An observable emitting the created checklist details.
   */
  public create(organizationId: string, input: CreateChecklistInput): Observable<ChecklistOutput> {
    return this.post<CreateChecklistInput, ChecklistOutput>(
      `${ChecklistService.BASE_PATH}/${organizationId}/checklists`,
      input,
    );
  }

  /**
   * Method update
   * @method update
   *
   * @description
   * Partially updates a checklist template (name, reference code, items).
   * `items` is a full replacement list when provided, never a merge — the
   * backend rejects the write with a conflict once the checklist is
   * referenced by an existing inspection.
   *
   * @access public
   * @since 2.1.0
   *
   * @param {string} organizationId - The ID of the organization.
   * @param {string} checklistId - The ID of the checklist to update.
   * @param {UpdateChecklistInput} input - The fields to change.
   *
   * @returns {Observable<ChecklistOutput>} An observable emitting the updated checklist details.
   */
  public update(
    organizationId: string,
    checklistId: string,
    input: UpdateChecklistInput,
  ): Observable<ChecklistOutput> {
    return this.patch<UpdateChecklistInput, ChecklistOutput>(
      `${ChecklistService.BASE_PATH}/${organizationId}/checklists/${checklistId}`,
      input,
    );
  }

  /**
   * Method archive
   * @method archive
   *
   * @description
   * Marks a checklist template as archived, preventing it from being
   * used in new inspections without permanently deleting it.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - The ID of the organization.
   * @param {string} checklistId - The ID of the checklist to archive.
   *
   * @returns {Observable<ChecklistOutput>} An observable emitting the archived checklist details.
   */
  public archive(organizationId: string, checklistId: string): Observable<ChecklistOutput> {
    return this.postAction<ChecklistOutput>(
      `${ChecklistService.BASE_PATH}/${organizationId}/checklists/${checklistId}/archive`,
    );
  }
  //#endregion
}
