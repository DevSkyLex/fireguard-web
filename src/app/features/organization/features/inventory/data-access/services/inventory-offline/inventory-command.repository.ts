import { inject, Service } from '@angular/core';
import { IndexedDbService, type IndexedDbSchema } from '@core/indexed-db';
import { WriteOperationService, type WriteOperation } from '@core/request-state';
import { AUTH_SESSION_PORT, type AuthSessionPort } from '@features/auth/ports';
import type { InventoryPhysicalCommand } from '@features/organization/features/inventory/models';
import {
  ORGANIZATION_MEMBER_ACCESS_PORT,
  type OrganizationMemberAccessPort,
} from '@features/organization/ports/organization-member-access';

/**
 * Class InventoryCommandRepository
 *
 * @description
 * A small account-bound journal preserves physical commands before transmission.
 */
@Service()
export class InventoryCommandRepository extends IndexedDbService {
  /**
   * Property writeOperations
   * @readonly
   *
   * @description
   * Mints receipt identities inside the owning IndexedDB transaction.
   *
   * @access private
   * @since unreleased
   *
   * @type {WriteOperationService}
   */
  private readonly writeOperations: WriteOperationService = inject(WriteOperationService);

  /**
   * Property schema
   * @readonly
   *
   * @description
   * Independent database contains immutable unresolved stock commands.
   *
   * @access protected
   * @since unreleased
   *
   * @type {IndexedDbSchema}
   */
  protected readonly schema: IndexedDbSchema = {
    name: 'fireguard-inventory',
    version: 1,
    storeNames: ['metadata', 'commands'],
    ownerStoreName: 'metadata',
  };
  /**
   * Property member
   * @readonly
   *
   * @description
   * Published account identity prevents cross-session replay.
   *
   * @access private
   * @since unreleased
   *
   * @type {OrganizationMemberAccessPort}
   */
  private readonly member: OrganizationMemberAccessPort = inject(ORGANIZATION_MEMBER_ACCESS_PORT);
  /**
   * Property session
   * @readonly
   *
   * @description
   * Local generation fences clearing and replacement, without persisting tokens.
   *
   * @access private
   * @since unreleased
   *
   * @type {AuthSessionPort}
   */
  private readonly session: AuthSessionPort = inject(AUTH_SESSION_PORT);
  /**
   * Property writes
   *
   * @description
   * Serializes local identity checks before immutable journal writes.
   *
   * @access private
   * @since unreleased
   *
   * @type {Promise<void>}
   */
  private writes: Promise<void> = Promise.resolve();

  /**
   * Method sessionRevision
   *
   * @description
   * Captures the current session generation before asynchronous work.
   *
   * @access public
   * @since unreleased
   *
   * @returns {number} Local session generation.
   */
  public sessionRevision(): number {
    return this.session.sessionRevision();
  }

  /**
   * Method isCurrent
   *
   * @description
   * Tests active membership without silently rebinding an old operation.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} userId - Captured account.
   * @param {string} organizationId - Captured organization.
   * @param {number} revision - Captured command context.
   *
   * @returns {boolean} Whether the actor still owns the active organization.
   */
  public isCurrent(
    userId: string,
    organizationId: string,
    revision: number = this.sessionRevision(),
  ): boolean {
    const profile = this.member.profile();
    return (
      this.browser &&
      this.session.isAuthenticated() &&
      this.session.sessionRevision() === revision &&
      !!profile?.isActive &&
      profile.userId === userId &&
      profile.organizationId === organizationId
    );
  }

  /**
   * Method readPending
   *
   * @description
   * Returns only the active user's organization journal; never auto-sends records.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} userId - Captured account.
   * @param {string} organizationId - Captured organization.
   *
   * @returns {Promise<readonly InventoryPhysicalCommand[]>} Pending immutable commands.
   */
  public async readPending(
    userId: string,
    organizationId: string,
  ): Promise<readonly InventoryPhysicalCommand[]> {
    const revision = this.sessionRevision();
    if (!this.isCurrent(userId, organizationId, revision)) return [];
    await this.ensureOwnerBound(userId);
    if (!this.isCurrent(userId, organizationId, revision)) return [];
    const commands = await this.getAll<InventoryPhysicalCommand>('commands');
    return this.isCurrent(userId, organizationId, revision)
      ? commands.filter(
          (command) => command.userId === userId && command.organizationId === organizationId,
        )
      : [];
  }

  /**
   * Method retain
   *
   * @description
   * Commits one immutable intention before any network side effect.
   *
   * @access public
   * @since unreleased
   *
   * @param {InventoryPhysicalCommand} command - Stable UUID and body.
   *
   * @returns {Promise<WriteOperation>} Committed receipt identity or explicit local-storage
   *   failure.
   */
  public retain(command: InventoryPhysicalCommand): Promise<WriteOperation> {
    const frozen = structuredClone(command);
    const revision = this.sessionRevision();
    const current = () => this.isCurrent(command.userId, command.organizationId, revision);
    const retained = this.writes
      .catch(() => undefined)
      .then(async () => {
        if (!current()) throw new Error('Inventory command ownership changed.');
        await this.ensureOwnerBound(command.userId);
        if (!current()) throw new Error('Inventory command ownership changed.');
        const id = frozen.input.clientOperationId;
        let identity: WriteOperation | null = null;
        await this.updateTransaction(
          { commands: [id] },
          (values) => {
            const previous = values['commands']?.[id] as
              | InventoryPhysicalCommand
              | null
              | undefined;
            if (
              previous &&
              JSON.stringify({ ...previous, idempotencyKey: undefined }) !==
                JSON.stringify({ ...frozen, idempotencyKey: undefined })
            )
              throw new Error(
                'Inventory command identity already belongs to a different intention.',
              );
            identity = {
              idempotencyKey:
                previous?.idempotencyKey ||
                frozen.idempotencyKey ||
                this.writeOperations.create().idempotencyKey,
            };
            return previous?.idempotencyKey
              ? { commands: [] }
              : { commands: [{ key: id, value: { ...frozen, ...identity } }] };
          },
          current,
        );
        if (!current() || identity === null)
          throw new Error('Inventory command ownership changed.');
        return identity;
      });
    this.writes = retained.then(
      () => undefined,
      () => undefined,
    );
    return retained;
  }

  /**
   * Method acknowledge
   *
   * @description
   * Removes only a confirmed command in its original active account.
   *
   * @access public
   * @since unreleased
   *
   * @param {InventoryPhysicalCommand} command - Confirmed physical intention.
   * @param {number} revision - Captured command context.
   *
   * @returns {Promise<void>} Journal acknowledgment.
   */
  public async acknowledge(
    command: InventoryPhysicalCommand,
    revision: number = this.sessionRevision(),
  ): Promise<void> {
    const current = () => this.isCurrent(command.userId, command.organizationId, revision);
    if (!current()) return;
    await this.remove('commands', command.input.clientOperationId, current);
  }
}
