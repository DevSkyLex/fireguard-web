import { inject, Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { forkJoin, map, of } from 'rxjs';
import {
  OrganizationInvitationService,
  OrganizationRoleService,
  OrganizationService,
} from '@features/organization/data-access';
import { EquipmentService } from '@features/organization/features/equipments/data-access';
import { FacilityService } from '@features/organization/features/facilities/data-access';
import { InspectionService } from '@features/organization/features/inspections/data-access';
import type {
  SetupCreateEquipmentInput,
  SetupCreateFacilityInput,
  SetupCreateInspectionInput,
  SetupCreateOrganizationInput,
  SetupEquipmentSummary,
  SetupInviteMemberInput,
  SetupOrganizationRole,
} from './organization-setup.types';

/**
 * Service OrganizationSetupService
 * @class OrganizationSetupService
 *
 * @description
 * Organization-owned facade published for onboarding and other approved setup
 * workflows. It narrows the public contract to setup-specific inputs and DTOs
 * so consumers do not depend directly on internal organization subfeature
 * payloads or services.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Injectable({
  providedIn: 'root',
})
export class OrganizationSetupService {
  /**
   * Property organizationService
   * @readonly
   *
   * @description
   * Core organization service used to create organizations.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {OrganizationService}
   */
  private readonly organizationService: OrganizationService =
    inject<OrganizationService>(OrganizationService);

  /**
   * Property organizationInvitationService
   * @readonly
   *
   * @description
   * Service used to send member invitations to an organization.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {OrganizationInvitationService}
   */
  private readonly organizationInvitationService: OrganizationInvitationService =
    inject<OrganizationInvitationService>(OrganizationInvitationService);

  /**
   * Property organizationRoleService
   * @readonly
   *
   * @description
   * Service used to list assignable roles within an organization.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {OrganizationRoleService}
   */
  private readonly organizationRoleService: OrganizationRoleService =
    inject<OrganizationRoleService>(OrganizationRoleService);

  /**
   * Property facilityService
   * @readonly
   *
   * @description
   * Service used to create facilities for an organization.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {FacilityService}
   */
  private readonly facilityService: FacilityService = inject<FacilityService>(FacilityService);

  /**
   * Property equipmentService
   * @readonly
   *
   * @description
   * Service used to list and create equipment records for an organization.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {EquipmentService}
   */
  private readonly equipmentService: EquipmentService = inject<EquipmentService>(EquipmentService);

  /**
   * Property inspectionService
   * @readonly
   *
   * @description
   * Service used to create inspection records for an organization.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {InspectionService}
   */
  private readonly inspectionService: InspectionService =
    inject<InspectionService>(InspectionService);

  /**
   * Method createOrganization
   *
   * @description
   * Creates an organization through the setup boundary and hides the internal
   * transport payload from consumers.
   *
   * @param {SetupCreateOrganizationInput} input Organization creation payload.
   * @returns {Observable<void>} Observable completing when the organization has been created.
   */
  public createOrganization(input: SetupCreateOrganizationInput): Observable<void> {
    return this.organizationService.create(input).pipe(map(() => undefined));
  }

  /**
   * Method listRoles
   *
   * @description
   * Lists assignable organization roles and maps them to the setup-owned DTO
   * shape exposed to consumers.
   *
   * @param {string} organizationId Target organization identifier.
   * @returns {Observable<readonly SetupOrganizationRole[]>} Observable emitting setup role summaries.
   */
  public listRoles(organizationId: string): Observable<readonly SetupOrganizationRole[]> {
    return this.organizationRoleService.list(organizationId).pipe(
      map((collection) =>
        collection.member.map((role) => ({
          id: role.id,
          name: role.name,
          description: role.description,
        })),
      ),
    );
  }

  /**
   * Method inviteMembers
   *
   * @description
   * Sends one or more member invitations for the target organization through
   * the setup boundary.
   *
   * @param {string} organizationId Target organization identifier.
   * @param {readonly SetupInviteMemberInput[]} invitations Invitations to create.
   * @returns {Observable<void>} Observable completing when all invitations have been sent.
   */
  public inviteMembers(
    organizationId: string,
    invitations: readonly SetupInviteMemberInput[],
  ): Observable<void> {
    if (invitations.length === 0) return of(undefined);

    return forkJoin(
      invitations.map((invitation) => {
        const roleIds: string[] | undefined = invitation.roleIds?.filter(
          (roleId): roleId is string => roleId !== null,
        );

        return this.organizationInvitationService.invite(organizationId, {
          ...invitation,
          roleIds: roleIds?.length ? roleIds : undefined,
        });
      }),
    ).pipe(map(() => undefined));
  }

  /**
   * Method createFacilities
   *
   * @description
   * Creates one or more facilities for the target organization and exposes a
   * setup-friendly completion-only contract to consumers.
   *
   * @param {string} organizationId Target organization identifier.
   * @param {readonly SetupCreateFacilityInput[]} facilities Facilities to create.
   * @returns {Observable<void>} Observable completing when all facilities have been created.
   */
  public createFacilities(
    organizationId: string,
    facilities: readonly SetupCreateFacilityInput[],
  ): Observable<void> {
    if (facilities.length === 0) return of(undefined);

    return forkJoin(
      facilities.map((facility) => this.facilityService.create(organizationId, facility)),
    ).pipe(map(() => undefined));
  }

  /**
   * Method listEquipment
   *
   * @description
   * Lists equipment records needed during setup flows and maps them to the
   * setup-owned summary DTO.
   *
   * @param {string} organizationId Target organization identifier.
   * @param {number} [itemsPerPage=100] Maximum number of items requested from the backend.
   * @returns {Observable<readonly SetupEquipmentSummary[]>} Observable emitting equipment summaries.
   */
  public listEquipment(
    organizationId: string,
    itemsPerPage: number = 100,
  ): Observable<readonly SetupEquipmentSummary[]> {
    return this.equipmentService.list(organizationId, { itemsPerPage }).pipe(
      map((collection) =>
        collection.member.map((equipment) => ({
          id: equipment.id,
          type: equipment.type,
          serialNumber: equipment.serialNumber,
        })),
      ),
    );
  }

  /**
   * Method createEquipment
   *
   * @description
   * Creates a new equipment record for the target organization through the
   * setup boundary.
   *
   * @param {string} organizationId Target organization identifier.
   * @param {SetupCreateEquipmentInput} input Equipment creation payload.
   * @returns {Observable<void>} Observable completing when the equipment has been created.
   */
  public createEquipment(
    organizationId: string,
    input: SetupCreateEquipmentInput,
  ): Observable<void> {
    return this.equipmentService.create(organizationId, input).pipe(map(() => undefined));
  }

  /**
   * Method createInspection
   *
   * @description
   * Creates an inspection record for setup flows without exposing the internal
   * organization inspection payloads to consumers.
   *
   * @param {string} organizationId Target organization identifier.
   * @param {SetupCreateInspectionInput} input Inspection creation payload.
   * @returns {Observable<void>} Observable completing when the inspection has been created.
   */
  public createInspection(
    organizationId: string,
    input: SetupCreateInspectionInput,
  ): Observable<void> {
    return this.inspectionService.create(organizationId, input).pipe(map(() => undefined));
  }
}
