import { Service } from '@angular/core';
import { defer, EMPTY, expand, reduce, type Observable } from 'rxjs';
import { HydraApiService, type RequestOptions } from '@core/api';
import type { HydraCollection } from '@core/api/models';
import type {
  CreateEquipmentTypeInput,
  EquipmentTypeOutput,
  UpdateEquipmentTypeInput,
} from '@features/organization/features/equipments/models';

/**
 * Class EquipmentTypeService
 * @class EquipmentTypeService
 *
 * @description
 * Reads the server-owned organization equipment catalog.
 */
@Service()
export class EquipmentTypeService extends HydraApiService {
  //#region Methods
  /**
   * Method list
   *
   * @description
   * Lists active and archived entries so historical records retain their labels.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} organizationId - Organization owning the catalog.
   * @param {RequestOptions} options - Optional transport query settings.
   *
   * @returns {Observable<HydraCollection<EquipmentTypeOutput>>} Server catalog.
   */
  public list(
    organizationId: string,
    options?: RequestOptions,
  ): Observable<HydraCollection<EquipmentTypeOutput>> {
    return this.getCollection<EquipmentTypeOutput>(
      `/api/organizations/${organizationId}/equipment-types`,
      options,
    );
  }
  /**
   * Method listAll
   *
   * @description
   * Reads the complete collection using actual progress, including a non-paginated server response.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} organizationId - Organization owning the catalog.
   *
   * @returns {Observable<readonly EquipmentTypeOutput[]>} Complete transport catalog.
   */
  public listAll(organizationId: string): Observable<readonly EquipmentTypeOutput[]> {
    const itemsPerPage = 200;
    return defer(() => {
      let received = 0;
      return this.list(organizationId, { itemsPerPage, page: 1 }).pipe(
        expand((collection, pageIndex) => {
          received += collection.member.length;
          return collection.member.length > 0 && received < collection.totalItems
            ? this.list(organizationId, { itemsPerPage, page: pageIndex + 2 })
            : EMPTY;
        }),
        reduce(
          (entries, collection) => [...entries, ...collection.member],
          [] as readonly EquipmentTypeOutput[],
        ),
      );
    });
  }
  /**
   * Method create
   * @method create
   *
   * @description
   * Adds one permanent code to the organization's catalogue.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} organizationId - Organization owning the catalogue.
   * @param {CreateEquipmentTypeInput} input - Validated type identity and family.
   *
   * @returns {Observable<EquipmentTypeOutput>} Confirmed server descriptor.
   */
  public create(
    organizationId: string,
    input: CreateEquipmentTypeInput,
  ): Observable<EquipmentTypeOutput> {
    return this.post<CreateEquipmentTypeInput, EquipmentTypeOutput>(
      `/api/organizations/${organizationId}/equipment-types`,
      input,
    );
  }

  /**
   * Method update
   * @method update
   *
   * @description
   * Changes or archives a descriptor using the revision reviewed by the operator.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} organizationId - Organization owning the catalogue.
   * @param {string} typeCode - Immutable equipment type code.
   * @param {UpdateEquipmentTypeInput} input - Revision and explicit changes.
   *
   * @returns {Observable<EquipmentTypeOutput>} Confirmed server descriptor.
   */
  public update(
    organizationId: string,
    typeCode: string,
    input: UpdateEquipmentTypeInput,
  ): Observable<EquipmentTypeOutput> {
    return this.patch<UpdateEquipmentTypeInput, EquipmentTypeOutput>(
      `/api/organizations/${organizationId}/equipment-types/${encodeURIComponent(typeCode)}`,
      input,
    );
  }
  //#endregion
}
