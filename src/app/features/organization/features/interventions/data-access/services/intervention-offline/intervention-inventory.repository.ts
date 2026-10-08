import { inject, Service } from '@angular/core';
import type {
  InterventionInventorySnapshot,
  InterventionOutput,
} from '@features/organization/features/interventions/models';
import type { InventoryConsumptionOutput } from '@features/organization/features/inventory/models';
import { InterventionDatabaseService } from './intervention-database.service';

/**
 * Class InterventionInventoryRepository
 * @class InterventionInventoryRepository
 *
 * @description
 * Persists ordinary stock references and declaration receipts in existing account-scoped metadata.
 * Financial amounts never enter this workspace snapshot.
 */
@Service()
export class InterventionInventoryRepository {
  //#region Properties
  /**
   * Property database
   * @readonly
   *
   * @description
   * Existing durable store whose owner binding also purges data on session termination.
   *
   * @access private
   * @since unreleased
   *
   * @type {InterventionDatabaseService}
   */
  private readonly database: InterventionDatabaseService = inject(InterventionDatabaseService);

  //#endregion

  //#region Methods
  /**
   * Method load
   * @method load
   *
   * @description
   * Restores only the current owner's correctly scoped snapshot without inventing an empty catalog.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} organizationId - Owning organization UUID.
   * @param {string} interventionId - Saved workspace UUID.
   * @param {() => boolean} isCurrent - Captured session, organization and permission guard.
   *
   * @returns {Promise<InterventionInventorySnapshot | null>} Authorized retained snapshot.
   */
  public async load(
    organizationId: string,
    interventionId: string,
    isCurrent: () => boolean,
  ): Promise<InterventionInventorySnapshot | null> {
    const owner = this.database.currentOwnerId();
    if (!owner || !isCurrent()) return null;
    await this.database.ensureOwnerBound();
    if (!isCurrent() || owner !== this.database.currentOwnerId()) return null;
    const snapshot = await this.database.get<InterventionInventorySnapshot>(
      'metadata',
      this.key(owner, organizationId, interventionId),
    );
    if (!isCurrent() || owner !== this.database.currentOwnerId()) return null;
    return this.scopedSnapshot(snapshot, owner, organizationId, interventionId);
  }

  /**
   * Method save
   * @method save
   *
   * @description
   * Commits a complete snapshot only while its already-saved workspace and captured owner match.
   *
   * @access public
   * @since unreleased
   *
   * @param {InterventionInventorySnapshot} snapshot - Scoped complete or receipt-only snapshot.
   * @param {() => boolean} isCurrent - Captured authorization and session guard.
   *
   * @returns {Promise<void>} Resolves only after durable persistence is confirmed.
   */
  public async save(
    snapshot: InterventionInventorySnapshot,
    isCurrent: () => boolean,
  ): Promise<void> {
    return this.persist(snapshot, isCurrent);
  }

  /**
   * Method persist
   * @method persist
   *
   * @description
   * Reads ownership, workspace and retained facts in the same transaction as the merged write.
   * IndexedDB serializes mutations across repository instances and browser tabs.
   *
   * @access private
   * @since unreleased
   *
   * @param {InterventionInventorySnapshot} snapshot - Scoped references and declarations to merge
   *   with retained accepted facts.
   * @param {() => boolean} isCurrent - Captured authorization guard checked before and after
   *   persistence.
   * @param {boolean} receiptOnly - Preserve retained catalogs and coverage for an individual
   *   receipt.
   *
   * @returns {Promise<void>} Resolves only after the owner-scoped metadata write completes.
   */
  private async persist(
    snapshot: InterventionInventorySnapshot,
    isCurrent: () => boolean,
    receiptOnly = false,
  ): Promise<void> {
    this.assertCurrent(snapshot.accountId, isCurrent);
    await this.database.ensureOwnerBound();
    this.assertCurrent(snapshot.accountId, isCurrent);
    const key = this.key(snapshot.accountId, snapshot.organizationId, snapshot.interventionId);
    await this.database.updateTransaction(
      {
        metadata: ['ownerUserId', key],
        interventions: [snapshot.interventionId],
      },
      (values) => {
        this.assertCurrent(snapshot.accountId, isCurrent);
        if (values['metadata']?.['ownerUserId'] !== snapshot.accountId)
          throw new DOMException('Inventory snapshot ownership changed.', 'AbortError');
        const workspace = values['interventions']?.[
          snapshot.interventionId
        ] as InterventionOutput | null;
        if (workspace?.organization !== `/api/organizations/${snapshot.organizationId}`)
          throw new Error(
            $localize`:@@intervention.inventory.prepareRequired:Save this intervention on the device before preparing its stock references.`,
          );
        const previous = this.scopedSnapshot(
          values['metadata']?.[key],
          snapshot.accountId,
          snapshot.organizationId,
          snapshot.interventionId,
        );
        const declarations = new Map<string, InventoryConsumptionOutput>();
        for (const item of previous?.declarations ?? []) declarations.set(item.id, item);
        for (const item of snapshot.declarations) {
          const retained = declarations.get(item.id);
          if (retained?.status === 'confirmed' && item.status === 'received_pending') continue;
          declarations.set(item.id, item);
        }
        const retainedReferences = receiptOnly && previous ? previous : snapshot;
        return {
          metadata: [
            {
              key,
              value: {
                ...retainedReferences,
                capturedAt: snapshot.capturedAt,
                declarations: [...declarations.values()],
              },
            },
          ],
        };
      },
      () => isCurrent() && snapshot.accountId === this.database.currentOwnerId(),
    );
    this.assertCurrent(snapshot.accountId, isCurrent);
  }

  /**
   * Method saveReceipt
   * @method saveReceipt
   *
   * @description
   * Retains an accepted server fact before removing its idempotent local operation.
   * A receipt alone cannot claim that either the catalog or server history is complete.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} organizationId - Replay organization.
   * @param {string} accountId - Account captured before the server write.
   * @param {InventoryConsumptionOutput} receipt - Accepted quantitative declaration.
   * @param {() => boolean} isCurrent - Captured replay session and organization guard.
   *
   * @returns {Promise<void>} Durable server acknowledgment.
   */
  public async saveReceipt(
    organizationId: string,
    accountId: string,
    receipt: InventoryConsumptionOutput,
    isCurrent: () => boolean,
  ): Promise<void> {
    return this.persist(
      {
        version: 1,
        accountId,
        organizationId,
        interventionId: receipt.interventionId,
        capturedAt: new Date().toISOString(),
        catalogComplete: false,
        declarationsComplete: false,
        parts: [],
        warehouses: [],
        declarations: [receipt],
      },
      isCurrent,
      true,
    );
  }

  /**
   * Method scopedSnapshot
   * @method scopedSnapshot
   *
   * @description
   * Accepts only the expected version and scope with usable reference and declaration arrays.
   *
   * @access private
   * @since unreleased
   *
   * @param {unknown} value - Persisted metadata, including missing or malformed records.
   * @param {string} owner - Account owner.
   * @param {string} organizationId - Organization UUID.
   * @param {string} interventionId - Workspace UUID.
   *
   * @returns {InterventionInventorySnapshot | null} Valid scoped snapshot or null.
   */
  private scopedSnapshot(
    value: unknown,
    owner: string,
    organizationId: string,
    interventionId: string,
  ): InterventionInventorySnapshot | null {
    const snapshot = value as InterventionInventorySnapshot | null | undefined;
    if (
      snapshot?.version !== 1 ||
      snapshot.accountId !== owner ||
      snapshot.organizationId !== organizationId ||
      snapshot.interventionId !== interventionId ||
      !Array.isArray(snapshot.parts) ||
      !Array.isArray(snapshot.warehouses) ||
      !Array.isArray(snapshot.declarations)
    )
      return null;
    return snapshot;
  }

  /**
   * Method key
   * @method key
   *
   * @description
   * Separates references and facts for each account, organization and workspace.
   *
   * @access private
   * @since unreleased
   *
   * @param {string} owner - Account owner.
   * @param {string} organizationId - Organization UUID.
   * @param {string} interventionId - Workspace UUID.
   *
   * @returns {string} Metadata key.
   */
  private key(owner: string, organizationId: string, interventionId: string): string {
    return `inventorySnapshot:${owner}:${organizationId}:${interventionId}`;
  }

  /**
   * Method assertCurrent
   * @method assertCurrent
   *
   * @description
   * Rejects obsolete persistence instead of acknowledging an operation under a replacement account.
   *
   * @access private
   * @since unreleased
   *
   * @param {string} owner - Captured account owner.
   * @param {() => boolean} isCurrent - Additional session and organization fence.
   *
   * @returns {void} Throws on obsolete scope.
   */
  private assertCurrent(owner: string, isCurrent: () => boolean): void {
    if (!isCurrent() || owner !== this.database.currentOwnerId())
      throw new DOMException('Inventory snapshot ownership changed.', 'AbortError');
  }
  //#endregion
}
