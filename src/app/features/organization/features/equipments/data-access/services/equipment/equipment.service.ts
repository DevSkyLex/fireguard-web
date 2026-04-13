import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import type { HydraCollection, OptionOutput } from '@core/models/api';
import { HydraApiService, type RequestOptions } from '@core/services/hydra-api';
import type {
  EquipmentOutput,
  CreateEquipmentInput,
  UpdateEquipmentInput,
  AssignToFacilityInput,
  EquipmentAttachmentOutput,
  EquipmentMaintenanceLogOutput,
  AddAttachmentInput,
  EquipmentTagOutput,
  AddTagInput,
} from '@features/organization/features/equipments/models';

/**
 * Service EquipmentService
 * @class EquipmentService
 * @extends {HydraApiService}
 *
 * @description
 * API service for equipment management operations.
 * Handles CRUD, lifecycle actions (commission, decommission, maintenance),
 * facility assignment, attachments, and tags.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Injectable({ providedIn: 'root' })
export class EquipmentService extends HydraApiService {
  //#region Properties
  /**
   * Property BASE_PATH
   * @readonly
   * @static
   *
   * @description
   * Base API path for equipment-related endpoints, structured as:
   * /api/organizations/{organizationId}/equipment
   *
   * @access private
   * @since 1.0.0
   *
   * @type {string}
   */
  private static readonly BASE_PATH: string = '/api/organizations';
  //#endregion

  //#region Methods
  /**
   * Method equipmentPath
   * @method equipmentPath
   *
   * @description
   * Constructs the API path for equipment endpoints,
   * optionally including an equipment ID.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {string} organizationId - The ID of the organization.
   * @param {string} [equipmentId] - Optional ID of the equipment.
   *
   * @return {string} The constructed API path for equipment operations.
   */
  private equipmentPath(organizationId: string, equipmentId?: string): string {
    const base: string = `${EquipmentService.BASE_PATH}/${organizationId}/equipment`;
    return equipmentId ? `${base}/${equipmentId}` : base;
  }

  /**
   * Method list
   * @method list
   *
   * @description
   * Retrieves a paginated list of equipment for a given organization.
   * Supports optional pagination parameters via RequestOptions.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - The ID of the organization to list equipment for.
   * @param {RequestOptions} [options] - Optional request options for pagination and filtering.
   *
   * @return {Observable<HydraCollection<EquipmentOutput>>} An observable emitting a collection of equipment.
   */
  public list(
    organizationId: string,
    options?: RequestOptions,
  ): Observable<HydraCollection<EquipmentOutput>> {
    return this.getCollection<EquipmentOutput>(this.equipmentPath(organizationId), options);
  }

  public listStatuses(
    organizationId: string,
    options?: RequestOptions,
  ): Observable<HydraCollection<OptionOutput>> {
    return this.getCollection<OptionOutput>(
      `${EquipmentService.BASE_PATH}/${organizationId}/equipment-statuses`,
      options,
    );
  }

  public listTypes(
    organizationId: string,
    options?: RequestOptions,
  ): Observable<HydraCollection<OptionOutput>> {
    return this.getCollection<OptionOutput>(
      `${EquipmentService.BASE_PATH}/${organizationId}/equipment-types`,
      options,
    );
  }

  /**
   * Method get
   * @method get
   *
   * @description
   * Retrieves detailed information about a specific equipment by
   * its ID within an organization.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - The ID of the organization the equipment belongs to.
   * @param {string} equipmentId - The ID of the equipment to retrieve.
   *
   * @return {Observable<EquipmentOutput>} An observable emitting the equipment details.
   */
  public get(organizationId: string, equipmentId: string): Observable<EquipmentOutput> {
    return this.getOne<EquipmentOutput>(this.equipmentPath(organizationId, equipmentId));
  }

  /**
   * Method create
   * @method create
   *
   * @description
   * Creates a new equipment within the specified organization
   * using the provided input data.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - The ID of the organization to create the equipment in.
   * @param {CreateEquipmentInput} input - The data required to create the equipment.
   *
   * @return {Observable<EquipmentOutput>} An observable emitting the created equipment details.
   */
  public create(organizationId: string, input: CreateEquipmentInput): Observable<EquipmentOutput> {
    return this.post<CreateEquipmentInput, EquipmentOutput>(
      this.equipmentPath(organizationId),
      input,
    );
  }

  /**
   * Method update
   * @method update
   *
   * @description
   * Updates an existing equipment's information within the
   * specified organization using the provided input data.
   * Only fields included in the input will be updated.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - The ID of the organization the equipment belongs to.
   * @param {string} equipmentId - The ID of the equipment to update.
   * @param {UpdateEquipmentInput} input - The data to update the equipment with.
   *
   * @return {Observable<EquipmentOutput>} An observable emitting the updated equipment details.
   */
  public update(
    organizationId: string,
    equipmentId: string,
    input: UpdateEquipmentInput,
  ): Observable<EquipmentOutput> {
    return this.patch<UpdateEquipmentInput, EquipmentOutput>(
      this.equipmentPath(organizationId, equipmentId),
      input,
    );
  }

  /**
   * Method assignToFacility
   * @method assignToFacility
   *
   * @description
   * Assigns an equipment to a facility within the organization
   * using the provided input data.
   *
   * The input should include the ID of the
   * facility to assign the equipment to.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - The ID of the organization the equipment belongs to.
   * @param {string} equipmentId - The ID of the equipment to assign.
   * @param {AssignToFacilityInput} input - The data required to assign the equipment to a facility.
   *
   * @return {Observable<EquipmentOutput>} An observable emitting the updated equipment details after assignment.
   */
  public assignToFacility(
    organizationId: string,
    equipmentId: string,
    input: AssignToFacilityInput,
  ): Observable<EquipmentOutput> {
    return this.post<AssignToFacilityInput, EquipmentOutput>(
      `${this.equipmentPath(organizationId, equipmentId)}/assign`,
      input,
    );
  }

  /**
   * Method unassignFromFacility
   * @method unassignFromFacility
   *
   * @description
   * Unassigns an equipment from its currently assigned facility within the organization.
   * This action does not require any input data, as it simply removes the association
   * between the equipment and its assigned facility.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - The ID of the organization the equipment belongs to.
   * @param {string} equipmentId - The ID of the equipment to unassign from its facility.
   *
   * @return {Observable<EquipmentOutput>} An observable emitting the updated equipment details after unassignment.
   */
  public unassignFromFacility(
    organizationId: string,
    equipmentId: string,
  ): Observable<EquipmentOutput> {
    return this.postAction<EquipmentOutput>(
      `${this.equipmentPath(organizationId, equipmentId)}/unassign`,
    );
  }

  /**
   * Method commission
   * @method commission
   *
   * @description
   * Commissions an equipment, changing its status to
   * 'commissioned' and making it operational.
   * This action does not require any input data,
   * as it simply updates the equipment's lifecycle status.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - The ID of the organization the equipment belongs to.
   * @param {string} equipmentId - The ID of the equipment to commission.
   *
   * @return {Observable<EquipmentOutput>} An observable emitting the updated equipment details after commissioning.
   */
  public commission(organizationId: string, equipmentId: string): Observable<EquipmentOutput> {
    return this.postAction<EquipmentOutput>(
      `${this.equipmentPath(organizationId, equipmentId)}/commission`,
    );
  }

  /**
   * Method decommission
   * @method decommission
   *
   * @description
   * Decommissions an equipment, changing its status to 'decommissioned' and
   * marking it as no longer operational. This action does not require any input data,
   * as it simply updates the equipment's lifecycle status.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - The ID of the organization the equipment belongs to.
   * @param {string} equipmentId - The ID of the equipment to decommission.
   *
   * @return {Observable<EquipmentOutput>} An observable emitting the updated equipment details after decommissioning.
   */
  public decommission(organizationId: string, equipmentId: string): Observable<EquipmentOutput> {
    return this.postAction<EquipmentOutput>(
      `${this.equipmentPath(organizationId, equipmentId)}/decommission`,
    );
  }

  /**
   * Method maintenance
   * @method maintenance
   *
   * @description
   * Puts an equipment into maintenance mode, changing its status to 'maintenance' and
   * indicating that it is temporarily unavailable for use. This action does not require any input data,
   * as it simply updates the equipment's lifecycle status.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - The ID of the organization the equipment belongs to.
   * @param {string} equipmentId - The ID of the equipment to put into maintenance mode.
   *
   * @return {Observable<EquipmentOutput>} An observable emitting the updated equipment details after putting it into maintenance mode.
   */
  public maintenance(organizationId: string, equipmentId: string): Observable<EquipmentOutput> {
    return this.postAction<EquipmentOutput>(
      `${this.equipmentPath(organizationId, equipmentId)}/maintenance`,
    );
  }

  /**
   * Method listAttachments
   * @method listAttachments
   *
   * @description
   * Retrieves a list of attachments associated with a specific
   * equipment within an organization.
   *
   * Supports optional pagination parameters via RequestOptions.
   * Attachments can include documents, images, or other files related to the equipment.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - The ID of the organization the equipment belongs to.
   * @param {string} equipmentId - The ID of the equipment to list attachments for.
   * @param {RequestOptions} [options] - Optional request options for pagination and filtering.
   *
   * @return {Observable<HydraCollection<EquipmentAttachmentOutput>>} An observable emitting a collection of equipment attachments.
   */
  public listAttachments(
    organizationId: string,
    equipmentId: string,
    options?: RequestOptions,
  ): Observable<HydraCollection<EquipmentAttachmentOutput>> {
    return this.getCollection<EquipmentAttachmentOutput>(
      `${this.equipmentPath(organizationId, equipmentId)}/attachments`,
      options,
    );
  }

  public listMaintenanceLogs(
    organizationId: string,
    equipmentId: string,
    options?: RequestOptions,
  ): Observable<HydraCollection<EquipmentMaintenanceLogOutput>> {
    return this.getCollection<EquipmentMaintenanceLogOutput>(
      `${this.equipmentPath(organizationId, equipmentId)}/maintenance-logs`,
      options,
    );
  }

  public listTagCatalog(
    organizationId: string,
    search?: string,
    options?: RequestOptions,
  ): Observable<HydraCollection<EquipmentTagOutput>> {
    return this.getCollection<EquipmentTagOutput>(
      `${EquipmentService.BASE_PATH}/${organizationId}/equipment/tags`,
      {
        ...options,
        params: {
          ...options?.params,
          ...(search ? { search } : {}),
        },
      },
    );
  }

  /**
   * Method addAttachment
   * @method addAttachment
   *
   * @description
   * Adds a new attachment to a specific equipment within an
   * organization using the provided input data.
   *
   * The input should include details about the
   * attachment, such as the file, description, and any relevant metadata.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - The ID of the organization the equipment belongs to.
   * @param {string} equipmentId - The ID of the equipment to add the attachment to.
   * @param {AddAttachmentInput} input - The data required to add the attachment to the equipment.
   *
   * @return {Observable<EquipmentAttachmentOutput>} An observable emitting the details of the added attachment.
   */
  public addAttachment(
    organizationId: string,
    equipmentId: string,
    input: AddAttachmentInput,
  ): Observable<EquipmentAttachmentOutput> {
    return this.post<AddAttachmentInput, EquipmentAttachmentOutput>(
      `${this.equipmentPath(organizationId, equipmentId)}/attachments`,
      input,
    );
  }

  /**
   * Method deleteAttachment
   * @method deleteAttachment
   *
   * @description
   * Deletes an attachment from a specific equipment within an organization.
   * This action requires the ID of the attachment to be deleted, which is passed as a parameter.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - The ID of the organization the equipment belongs to.
   * @param {string} equipmentId - The ID of the equipment the attachment belongs to.
   * @param {string} attachmentId - The ID of the attachment to be deleted.
   *
   * @return {Observable<void>} An observable that completes when the attachment is successfully deleted.
   */
  public deleteAttachment(
    organizationId: string,
    equipmentId: string,
    attachmentId: string,
  ): Observable<void> {
    return this.delete(
      `${this.equipmentPath(organizationId, equipmentId)}/attachments/${attachmentId}`,
    );
  }

  /**
   * Method addTag
   * @method addTag
   *
   * @description
   * Adds a new tag to a specific equipment within an organization using the provided input data.
   * Tags are used to categorize and label equipment for easier organization and searchability.
   *
   * The input should include the name of the tag to be added to the equipment.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - The ID of the organization the equipment belongs to.
   * @param {string} equipmentId - The ID of the equipment to add the tag to.
   * @param {AddTagInput} input - The data required to add the tag to the equipment, typically including the tag name.
   *
   * @return {Observable<EquipmentTagOutput>} An observable emitting the details of the added tag, including its ID and name.
   */
  public addTag(
    organizationId: string,
    equipmentId: string,
    input: AddTagInput,
  ): Observable<EquipmentTagOutput> {
    return this.post<AddTagInput, EquipmentTagOutput>(
      `${this.equipmentPath(organizationId, equipmentId)}/tags`,
      input,
    );
  }

  /**
   * Method removeTag
   * @method removeTag
   *
   * @description
   * Removes a tag from a specific equipment within an organization.
   * This action requires the ID of the tag to be removed, which
   * is passed as a parameter.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - The ID of the organization the equipment belongs to.
   * @param {string} equipmentId - The ID of the equipment the tag belongs to.
   * @param {string} tagId - The ID of the tag to be removed from the equipment.
   *
   * @return {Observable<void>} An observable that completes when the tag is successfully removed from the equipment.
   */
  public removeTag(organizationId: string, equipmentId: string, tagId: string): Observable<void> {
    return this.delete(`${this.equipmentPath(organizationId, equipmentId)}/tags/${tagId}`);
  }
  //#endregion
}
