import { Service } from '@angular/core';
import type { Observable } from 'rxjs';
import { HydraApiService, type RequestOptions } from '@core/api';
import type { HydraCollection } from '@core/api/models';
import type {
  InventoryPartOutput,
  CreateInventoryPartInput,
  UpdateInventoryPartInput,
  InventoryWarehouseOutput,
  CreateInventoryWarehouseInput,
  UpdateInventoryWarehouseInput,
  InventoryBalanceOutput,
  InventoryMovementOutput,
  InventoryConsumptionOutput,
  DeclareInventoryConsumptionInput,
  ReturnInventoryConsumptionInput,
  CorrectInventoryStockInput,
} from '@features/organization/features/inventory/models';

/**
 * Class InventoryService
 * @class InventoryService
 *
 * @description
 * Organization-scoped Inventory transport preserves exact string quantities and stable command
 * UUIDs.
 */
@Service()
export class InventoryService extends HydraApiService {
  //#region Methods
  /**
   * Method listParts
   * @method listParts
   *
   * @description
   * Lists quantitative references with server search, archive filtering and pagination.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} organizationId - Organization owning the inventory.
   * @param {RequestOptions | undefined} options - Query filters and server page.
   *
   * @returns {Observable<HydraCollection<InventoryPartOutput>>} Server-owned page and exact total.
   */
  public listParts(
    organizationId: string,
    options?: RequestOptions,
  ): Observable<HydraCollection<InventoryPartOutput>> {
    return this.getCollection<InventoryPartOutput>(
      `/api/organizations/${organizationId}/inventory-parts`,
      options,
    );
  }

  /**
   * Method listWarehouses
   * @method listWarehouses
   *
   * @description
   * Lists stock warehouses with server search, archive filtering and pagination.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} organizationId - Organization owning the inventory.
   * @param {RequestOptions | undefined} options - Query filters and server page.
   *
   * @returns {Observable<HydraCollection<InventoryWarehouseOutput>>} Server-owned page and exact
   *   total.
   */
  public listWarehouses(
    organizationId: string,
    options?: RequestOptions,
  ): Observable<HydraCollection<InventoryWarehouseOutput>> {
    return this.getCollection<InventoryWarehouseOutput>(
      `/api/organizations/${organizationId}/inventory-warehouses`,
      options,
    );
  }

  /**
   * Method listBalances
   * @method listBalances
   *
   * @description
   * Reads quantity-only balances filtered by part or warehouse.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} organizationId - Organization owning the inventory.
   * @param {RequestOptions | undefined} options - Query filters and server page.
   *
   * @returns {Observable<HydraCollection<InventoryBalanceOutput>>} Server-owned page and exact
   *   total.
   */
  public listBalances(
    organizationId: string,
    options?: RequestOptions,
  ): Observable<HydraCollection<InventoryBalanceOutput>> {
    return this.getCollection<InventoryBalanceOutput>(
      `/api/organizations/${organizationId}/inventory-balances`,
      options,
    );
  }

  /**
   * Method listConsumptions
   * @method listConsumptions
   *
   * @description
   * Reads received declarations independently of local queue and work completion.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} organizationId - Organization owning the inventory.
   * @param {RequestOptions | undefined} options - Query filters and server page.
   *
   * @returns {Observable<HydraCollection<InventoryConsumptionOutput>>} Server-owned page and exact
   *   total.
   */
  public listConsumptions(
    organizationId: string,
    options?: RequestOptions,
  ): Observable<HydraCollection<InventoryConsumptionOutput>> {
    return this.getCollection<InventoryConsumptionOutput>(
      `/api/organizations/${organizationId}/inventory-consumptions`,
      options,
    );
  }

  /**
   * Method listMovements
   * @method listMovements
   *
   * @description
   * Reads immutable quantity-only stock movement history.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} organizationId - Organization owning the inventory.
   * @param {RequestOptions | undefined} options - Query filters and server page.
   *
   * @returns {Observable<HydraCollection<InventoryMovementOutput>>} Server-owned page and exact
   *   total.
   */
  public listMovements(
    organizationId: string,
    options?: RequestOptions,
  ): Observable<HydraCollection<InventoryMovementOutput>> {
    return this.getCollection<InventoryMovementOutput>(
      `/api/organizations/${organizationId}/inventory-movements`,
      options,
    );
  }

  /**
   * Method readPart
   * @method readPart
   *
   * @description
   * Hydrates a retained identity independently of directory search and pagination.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} organizationId - Organization owning the inventory.
   * @param {string} id - Stable server resource identity.
   *
   * @returns {Observable<InventoryPartOutput>} Current canonical resource.
   */
  public readPart(organizationId: string, id: string): Observable<InventoryPartOutput> {
    return this.getOne<InventoryPartOutput>(
      `/api/organizations/${organizationId}/inventory-parts/${encodeURIComponent(id)}`,
    );
  }

  /**
   * Method readWarehouse
   * @method readWarehouse
   *
   * @description
   * Hydrates a retained identity independently of directory search and pagination.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} organizationId - Organization owning the inventory.
   * @param {string} id - Stable server resource identity.
   *
   * @returns {Observable<InventoryWarehouseOutput>} Current canonical resource.
   */
  public readWarehouse(organizationId: string, id: string): Observable<InventoryWarehouseOutput> {
    return this.getOne<InventoryWarehouseOutput>(
      `/api/organizations/${organizationId}/inventory-warehouses/${encodeURIComponent(id)}`,
    );
  }

  /**
   * Method readConsumption
   * @method readConsumption
   *
   * @description
   * Hydrates a retained identity independently of directory search and pagination.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} organizationId - Organization owning the inventory.
   * @param {string} id - Stable server resource identity.
   *
   * @returns {Observable<InventoryConsumptionOutput>} Current canonical resource.
   */
  public readConsumption(
    organizationId: string,
    id: string,
  ): Observable<InventoryConsumptionOutput> {
    return this.getOne<InventoryConsumptionOutput>(
      `/api/organizations/${organizationId}/inventory-consumptions/${encodeURIComponent(id)}`,
    );
  }

  /**
   * Method createPart
   * @method createPart
   *
   * @description
   * Creates a part or consumable reference with permanent code and category.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} organizationId - Organization owning the inventory.
   * @param {CreateInventoryPartInput} input - Validated transport input preserved through retries.
   *
   * @returns {Observable<InventoryPartOutput>} Confirmed server resource or declaration receipt.
   */
  public createPart(
    organizationId: string,
    input: CreateInventoryPartInput,
  ): Observable<InventoryPartOutput> {
    return this.post<CreateInventoryPartInput, InventoryPartOutput>(
      `/api/organizations/${organizationId}/inventory-parts`,
      input,
    );
  }

  /**
   * Method createWarehouse
   * @method createWarehouse
   *
   * @description
   * Creates a warehouse with a permanent code.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} organizationId - Organization owning the inventory.
   * @param {CreateInventoryWarehouseInput} input - Validated transport input preserved through
   *   retries.
   *
   * @returns {Observable<InventoryWarehouseOutput>} Confirmed server resource or declaration
   *   receipt.
   */
  public createWarehouse(
    organizationId: string,
    input: CreateInventoryWarehouseInput,
  ): Observable<InventoryWarehouseOutput> {
    return this.post<CreateInventoryWarehouseInput, InventoryWarehouseOutput>(
      `/api/organizations/${organizationId}/inventory-warehouses`,
      input,
    );
  }

  /**
   * Method declareConsumption
   * @method declareConsumption
   *
   * @description
   * Records a physical declaration with the immutable client operation UUID.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} organizationId - Organization owning the inventory.
   * @param {DeclareInventoryConsumptionInput} input - Validated transport input preserved through
   *   retries.
   *
   * @returns {Observable<InventoryConsumptionOutput>} Confirmed server resource or declaration
   *   receipt.
   */
  public declareConsumption(
    organizationId: string,
    input: DeclareInventoryConsumptionInput,
  ): Observable<InventoryConsumptionOutput> {
    return this.post<DeclareInventoryConsumptionInput, InventoryConsumptionOutput>(
      `/api/organizations/${organizationId}/inventory-consumptions`,
      input,
    );
  }

  /**
   * Method returnConsumption
   * @method returnConsumption
   *
   * @description
   * Records a motivated compensating return using one stable command UUID.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} organizationId - Organization owning the inventory.
   * @param {ReturnInventoryConsumptionInput} input - Validated transport input preserved through
   *   retries.
   *
   * @returns {Observable<InventoryMovementOutput>} Confirmed server resource or declaration
   *   receipt.
   */
  public returnConsumption(
    organizationId: string,
    input: ReturnInventoryConsumptionInput,
  ): Observable<InventoryMovementOutput> {
    return this.post<ReturnInventoryConsumptionInput, InventoryMovementOutput>(
      `/api/organizations/${organizationId}/inventory-returns`,
      input,
    );
  }

  /**
   * Method correctStock
   * @method correctStock
   *
   * @description
   * Records a motivated signed stock correction using dedicated financial authorization.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} organizationId - Organization owning the inventory.
   * @param {CorrectInventoryStockInput} input - Validated transport input preserved through
   *   retries.
   *
   * @returns {Observable<InventoryMovementOutput>} Confirmed server resource or declaration
   *   receipt.
   */
  public correctStock(
    organizationId: string,
    input: CorrectInventoryStockInput,
  ): Observable<InventoryMovementOutput> {
    return this.post<CorrectInventoryStockInput, InventoryMovementOutput>(
      `/api/organizations/${organizationId}/inventory-corrections`,
      input,
    );
  }

  /**
   * Method updatePart
   * @method updatePart
   *
   * @description
   * Changes mutable descriptions or archive state without replacing permanent reference codes.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} organizationId - Organization owning the inventory.
   * @param {string} id - Stable server reference identity.
   * @param {UpdateInventoryPartInput} input - Explicit mutable fields.
   *
   * @returns {Observable<InventoryPartOutput>} Current server reference.
   */
  public updatePart(
    organizationId: string,
    id: string,
    input: UpdateInventoryPartInput,
  ): Observable<InventoryPartOutput> {
    return this.patch<UpdateInventoryPartInput, InventoryPartOutput>(
      `/api/organizations/${organizationId}/inventory-parts/${encodeURIComponent(id)}`,
      input,
    );
  }

  /**
   * Method updateWarehouse
   * @method updateWarehouse
   *
   * @description
   * Changes mutable descriptions or archive state without replacing permanent reference codes.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} organizationId - Organization owning the inventory.
   * @param {string} id - Stable server reference identity.
   * @param {UpdateInventoryWarehouseInput} input - Explicit mutable fields.
   *
   * @returns {Observable<InventoryWarehouseOutput>} Current server reference.
   */
  public updateWarehouse(
    organizationId: string,
    id: string,
    input: UpdateInventoryWarehouseInput,
  ): Observable<InventoryWarehouseOutput> {
    return this.patch<UpdateInventoryWarehouseInput, InventoryWarehouseOutput>(
      `/api/organizations/${organizationId}/inventory-warehouses/${encodeURIComponent(id)}`,
      input,
    );
  }

  /**
   * Method reconcileConsumption
   * @method reconcileConsumption
   *
   * @description
   * Re-evaluates the full declaration against stock without changing the physical fact or debiting
   * partially.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} organizationId - Organization owning the declaration.
   * @param {string} id - Current declaration identity.
   *
   * @returns {Observable<InventoryConsumptionOutput>} Current confirmed or received-pending state.
   */
  public reconcileConsumption(
    organizationId: string,
    id: string,
  ): Observable<InventoryConsumptionOutput> {
    return this.post<Record<string, never>, InventoryConsumptionOutput>(
      `/api/organizations/${organizationId}/inventory-consumptions/${encodeURIComponent(id)}/reconcile`,
      {},
    );
  }
  //#endregion
}
