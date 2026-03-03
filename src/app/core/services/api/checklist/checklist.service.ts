import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { BaseApiService } from '../base-api.service';
import type { RequestOptions } from '../base-api.service';
import type { HydraCollection } from '@core/models/api';
import type {
  ChecklistOutput,
  CreateChecklistInput,
} from '@core/models/checklist';

/**
 * Service ChecklistService
 * @class ChecklistService
 * @extends {BaseApiService}
 *
 * @description
 * API service for checklist template management.
 * Allows listing, getting, creating, and archiving
 * inspection checklist templates.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Injectable({ providedIn: 'root' })
export class ChecklistService extends BaseApiService {
  //#region Constants
  private static readonly BASE_PATH: string = '/api/organizations';
  //#endregion

  //#region Public Methods
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
   * @return {Observable<HydraCollection<ChecklistOutput>>} An observable emitting the checklists collection.
   */
  public list(
    organizationId: string,
    options?: RequestOptions,
  ): Observable<HydraCollection<ChecklistOutput>> {
    return this.getCollection<ChecklistOutput>(
      `${ChecklistService.BASE_PATH}/${organizationId}/checklists`,
      options,
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
   * @return {Observable<ChecklistOutput>} An observable emitting the checklist details.
   */
  public get(
    organizationId: string,
    checklistId: string,
  ): Observable<ChecklistOutput> {
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
   * @return {Observable<ChecklistOutput>} An observable emitting the created checklist details.
   */
  public create(
    organizationId: string,
    input: CreateChecklistInput,
  ): Observable<ChecklistOutput> {
    return this.post<CreateChecklistInput, ChecklistOutput>(
      `${ChecklistService.BASE_PATH}/${organizationId}/checklists`,
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
   * @return {Observable<ChecklistOutput>} An observable emitting the archived checklist details.
   */
  public archive(
    organizationId: string,
    checklistId: string,
  ): Observable<ChecklistOutput> {
    return this.postAction<ChecklistOutput>(
      `${ChecklistService.BASE_PATH}/${organizationId}/checklists/${checklistId}/archive`,
    );
  }
  //#endregion
}
