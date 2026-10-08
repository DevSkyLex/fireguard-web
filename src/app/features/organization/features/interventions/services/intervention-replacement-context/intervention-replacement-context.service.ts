import { inject, Service } from '@angular/core';
import { map, of, switchMap, throwError, type Observable } from 'rxjs';
import { EquipmentService } from '@features/organization/features/equipments/data-access';
import type { EquipmentOutput } from '@features/organization/features/equipments/models';
import type { InterventionReplacementContext } from '@features/organization/features/interventions/models';

/**
 * Constant EQUIPMENT_UUID
 *
 * @description
 * Equipment identifier grammar accepted by canonical equipment resources.
 *
 * @type {RegExp}
 */
const EQUIPMENT_UUID: RegExp = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

/**
 * Service InterventionReplacementContextService
 * @class InterventionReplacementContextService
 *
 * @description
 * Confirms a published equipment replacement using scoped server reads and reciprocal identities.
 */
@Service()
export class InterventionReplacementContextService {
  //#region Properties
  /**
   * Property equipment
   * @readonly
   *
   * @description
   * Equipment-owned transport for authorized organization-scoped reads.
   *
   * @access private
   * @since unreleased
   *
   * @type {EquipmentService}
   */
  private readonly equipment: EquipmentService = inject(EquipmentService);
  //#endregion

  //#region Methods
  /**
   * Method load
   * @method load
   *
   * @description
   * Reads the original before resolving its server-declared successor. Transport failures stay
   * observable so the owning query state can distinguish unavailable confirmation from absence.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} organizationId - Organization owning both equipment records.
   * @param {string} equipmentId - Canonical original equipment UUID.
   *
   * @returns {Observable<InterventionReplacementContext>} Original and confirmed successor facts.
   */
  public load(
    organizationId: string,
    equipmentId: string,
  ): Observable<InterventionReplacementContext> {
    if (!EQUIPMENT_UUID.test(equipmentId))
      return throwError(() => new Error('The replacement target must be an equipment UUID.'));
    return this.equipment.get(organizationId, equipmentId).pipe(
      switchMap((original) => {
        const successorId = original.successorEquipmentId;
        if (
          !this.hasCanonicalIdentity(original, organizationId, equipmentId) ||
          original.status !== 'decommissioned' ||
          !successorId ||
          !EQUIPMENT_UUID.test(successorId) ||
          successorId === original.id
        )
          return of({ original, successor: null });
        return this.equipment.get(organizationId, successorId).pipe(
          map((successor): InterventionReplacementContext => ({
            original,
            successor:
              this.hasCanonicalIdentity(successor, organizationId, successorId) &&
              successor.recordStatus === 'published' &&
              successor.predecessorEquipmentId === original.id
                ? successor
                : null,
          })),
        );
      }),
    );
  }

  /**
   * Method hasCanonicalIdentity
   * @method hasCanonicalIdentity
   *
   * @description
   * Verifies the equipment UUID and owning organization against a supported resource identity.
   *
   * @access private
   * @since unreleased
   *
   * @param {EquipmentOutput} equipment - Server record whose identity must be verified.
   * @param {string} organizationId - Requested owning organization.
   * @param {string} equipmentId - Expected canonical equipment UUID.
   *
   * @returns {boolean} Whether the returned record matches the requested resource.
   */
  private hasCanonicalIdentity(
    equipment: EquipmentOutput,
    organizationId: string,
    equipmentId: string,
  ): boolean {
    return (
      equipment.id === equipmentId &&
      EQUIPMENT_UUID.test(equipment.id) &&
      equipment.organizationId === organizationId &&
      (equipment['@id'] === `/api/organizations/${organizationId}/equipment/${equipmentId}` ||
        equipment['@id'] === `/api/equipment/${equipmentId}`)
    );
  }
  //#endregion
}
