import { expect, type Page, type Route } from '@playwright/test';
import type {
  DeclareInventoryConsumptionInput,
  InventoryConsumptionOutput,
  InventoryPartOutput,
  InventoryWarehouseOutput,
} from '@features/organization/features/inventory/models';
import { E2E_ORGANIZATION_ID, hydraCollection } from '../fixtures/api-fixtures';
import { E2E_INTERVENTION_ID } from '../fixtures/intervention-fixtures';

/**
 * Class InterventionInventoryApiMock
 * @class InterventionInventoryApiMock
 *
 * @description
 * Simulates quantitative references and idempotent server receipts for one intervention.
 * The caller installs ApiMock's authenticated session and safety net before these precise routes.
 */
export class InterventionInventoryApiMock {
  //#region Properties
  /**
   * Property parts
   * @readonly
   *
   * @description
   * Authorized quantitative references prepared with the saved workspace.
   *
   * @access public
   * @type {InventoryPartOutput[]}
   */
  public readonly parts: InventoryPartOutput[];

  /**
   * Property warehouses
   * @readonly
   *
   * @description
   * Authorized physical stock sources, independent of equipment locations.
   *
   * @access public
   * @type {InventoryWarehouseOutput[]}
   */
  public readonly warehouses: InventoryWarehouseOutput[];

  /**
   * Property writes
   * @readonly
   *
   * @description
   * Every received POST attempt retains its exact stable identity, quantity and physical timestamp.
   *
   * @access public
   * @type {DeclareInventoryConsumptionInput[]}
   */
  public readonly writes: DeclareInventoryConsumptionInput[] = [];

  /**
   * Property receipts
   * @readonly
   *
   * @description
   * Accepted physical facts appear once in the server history even after repeated POSTs.
   *
   * @access public
   * @type {InventoryConsumptionOutput[]}
   */
  public readonly receipts: InventoryConsumptionOutput[] = [];

  /**
   * Property operations
   * @readonly
   *
   * @description
   * Binds each client operation UUID to its original body and server receipt for exact replay.
   *
   * @access private
   * @type {Map<string, { input: DeclareInventoryConsumptionInput; receipt: InventoryConsumptionOutput }>}
   */
  private readonly operations: Map<
    string,
    { input: DeclareInventoryConsumptionInput; receipt: InventoryConsumptionOutput }
  > = new Map();
  /**
   * Property loseNextCommittedResponse
   *
   * @description
   * Aborts only the next newly accepted declaration response after recording its durable receipt.
   *
   * @access public
   * @type {boolean}
   */
  public loseNextCommittedResponse: boolean = false;
  //#endregion

  //#region Constructor
  /**
   * Constructor InterventionInventoryApiMock
   * @constructor
   *
   * @description
   * Uses the scenario's workspace and actor while keeping all inventory calls hermetic.
   *
   * @access public
   *
   * @param {Page} page - Browser page whose backend calls are intercepted.
   * @param {string} organizationId - Organization owning references and receipts.
   * @param {string} interventionId - Intervention allowed by the collection filter and POST body.
   * @param {string} actorId - Server-derived recording account identity.
   */
  public constructor(
    private readonly page: Page,
    private readonly organizationId: string = E2E_ORGANIZATION_ID,
    private readonly interventionId: string = E2E_INTERVENTION_ID,
    private readonly actorId: string = 'e2e-user-1',
  ) {
    const partId = 'ed500001-0000-4000-8000-000000000001';
    const warehouseId = 'ed500002-0000-4000-8000-000000000001';
    this.parts = [
      {
        '@id': `/api/organizations/${organizationId}/inventory-parts/${partId}`,
        '@type': 'InventoryPart',
        id: partId,
        code: 'SEAL',
        label: 'Valve seal',
        unit: 'piece',
        kind: 'part',
        archived: false,
      },
    ];
    this.warehouses = [
      {
        '@id': `/api/organizations/${organizationId}/inventory-warehouses/${warehouseId}`,
        '@type': 'InventoryWarehouse',
        id: warehouseId,
        code: 'VAN',
        name: 'Service van',
        archived: false,
      },
    ];
  }
  //#endregion

  //#region Methods
  /**
   * Method install
   * @method install
   *
   * @description
   * Installs only this organization's inventory references, scoped declaration list and item reads.
   * Unhandled methods and paths fall back to the caller's existing ApiMock safety net.
   *
   * @access public
   *
   * @returns {Promise<void>} Resolves when all precise query-tolerant interceptors are installed.
   */
  public async install(): Promise<void> {
    const prefix = `/api/organizations/${this.organizationId}`;
    await this.page.route(
      (url) => url.pathname === `${prefix}/inventory-parts`,
      async (route) => {
        if (route.request().method() !== 'GET') return route.fallback();
        const query = new URL(route.request().url()).searchParams;
        const archived = query.get('archived');
        const rows = this.parts.filter(
          (part) => archived === null || part.archived === (archived === 'true'),
        );
        await this.fulfillCollection(route, `${prefix}/inventory-parts`, rows);
      },
    );
    await this.page.route(
      (url) => url.pathname === `${prefix}/inventory-warehouses`,
      async (route) => {
        if (route.request().method() !== 'GET') return route.fallback();
        const query = new URL(route.request().url()).searchParams;
        const archived = query.get('archived');
        const rows = this.warehouses.filter(
          (warehouse) => archived === null || warehouse.archived === (archived === 'true'),
        );
        await this.fulfillCollection(route, `${prefix}/inventory-warehouses`, rows);
      },
    );
    await this.page.route(
      (url) => url.pathname === `${prefix}/inventory-consumptions`,
      async (route) => {
        if (route.request().method() === 'GET') {
          const query = new URL(route.request().url()).searchParams;
          expect(query.get('interventionId')).toBe(this.interventionId);
          const rows = this.receipts.filter((item) => item.interventionId === this.interventionId);
          await this.fulfillCollection(route, `${prefix}/inventory-consumptions`, rows);
          return;
        }
        if (route.request().method() !== 'POST') return route.fallback();
        const input = route.request().postDataJSON() as DeclareInventoryConsumptionInput;
        expect(input).not.toHaveProperty('actorId');
        expect(input).not.toHaveProperty('clientId');
        const requiredFields = [
          'clientOperationId',
          'partId',
          'warehouseId',
          'quantity',
          'interventionId',
          'occurredAt',
        ];
        const allowedFields = new Set([...requiredFields, 'workItemId', 'equipmentId']);
        expect(Object.keys(input)).toEqual(expect.arrayContaining(requiredFields));
        expect(Object.keys(input).every((key) => allowedFields.has(key))).toBe(true);
        expect(input.interventionId).toBe(this.interventionId);
        expect(input.clientOperationId).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        );
        expect(input.quantity).toMatch(/^\d+\.\d{6}$/);
        expect(Number.isNaN(Date.parse(input.occurredAt))).toBe(false);
        expect(this.parts.some((part) => part.id === input.partId)).toBe(true);
        expect(this.warehouses.some((warehouse) => warehouse.id === input.warehouseId)).toBe(true);
        this.writes.push({ ...input });
        const existing = this.operations.get(input.clientOperationId);
        if (existing) {
          expect(input).toEqual(existing.input);
          await route.fulfill({
            status: 201,
            contentType: 'application/ld+json',
            json: { ...existing.receipt, replayed: true },
          });
          return;
        }
        const id = `ed500003-0000-4000-8000-${String(this.receipts.length + 1).padStart(12, '0')}`;
        const receipt: InventoryConsumptionOutput = {
          '@id': `${prefix}/inventory-consumptions/${id}`,
          '@type': 'InventoryConsumption',
          id,
          partId: input.partId,
          warehouseId: input.warehouseId,
          quantity: input.quantity,
          interventionId: input.interventionId,
          workItemId: input.workItemId ?? null,
          equipmentId: input.equipmentId ?? null,
          actorId: this.actorId,
          occurredAt: input.occurredAt,
          status: 'received_pending',
          reason: 'insufficient_stock',
          movementId: null,
          late: false,
          replayed: false,
        };
        this.operations.set(input.clientOperationId, { input: { ...input }, receipt });
        this.receipts.push(receipt);
        if (this.loseNextCommittedResponse) {
          this.loseNextCommittedResponse = false;
          await route.abort('failed');
          return;
        }
        await route.fulfill({ status: 201, contentType: 'application/ld+json', json: receipt });
      },
    );
    await this.page.route(
      (url) =>
        url.pathname.startsWith(`${prefix}/inventory-consumptions/`) &&
        url.pathname.slice(`${prefix}/inventory-consumptions/`.length).indexOf('/') === -1,
      async (route) => {
        if (route.request().method() !== 'GET') return route.fallback();
        const id = new URL(route.request().url()).pathname.split('/').at(-1);
        const receipt = this.receipts.find((item) => item.id === id);
        if (!receipt) return route.fallback();
        await route.fulfill({ status: 200, contentType: 'application/ld+json', json: receipt });
      },
    );
  }

  /**
   * Method fulfillCollection
   * @method fulfillCollection
   *
   * @description
   * Preserves exact totals and bounded pagination in the canonical unprefixed Hydra collection.
   *
   * @access private
   *
   * @template Row - Typed quantitative reference or declaration.
   *
   * @param {Route} route - Intercepted collection request.
   * @param {string} path - Canonical organization-scoped collection IRI.
   * @param {readonly Row[]} rows - Complete authorized rows after server filtering.
   *
   * @returns {Promise<void>} Completed JSON-LD collection response.
   */
  private async fulfillCollection<Row>(
    route: Route,
    path: string,
    rows: readonly Row[],
  ): Promise<void> {
    const query = new URL(route.request().url()).searchParams;
    const page = Number(query.get('page') ?? 1);
    const pageSize = Number(query.get('itemsPerPage') ?? query.get('pageSize') ?? 100);
    expect(Number.isSafeInteger(page) && page >= 1).toBe(true);
    expect(Number.isSafeInteger(pageSize) && pageSize >= 1).toBe(true);
    await route.fulfill({
      status: 200,
      contentType: 'application/ld+json',
      json: hydraCollection(rows.slice((page - 1) * pageSize, page * pageSize), {
        '@id': path,
        totalItems: rows.length,
      }),
    });
  }
  //#endregion
}
