import { effect, inject, Service } from '@angular/core';
import { IndexedDbService, type IndexedDbSchema } from '@core/indexed-db';
import { AUTH_SESSION_PORT, type AuthSessionPort } from '@features/auth/ports';
import type { MaintenanceCostCommand } from '@features/organization/features/maintenance-costs/models';
import {
  ORGANIZATION_MEMBER_ACCESS_PORT,
  type OrganizationMemberAccessPort,
} from '@features/organization/ports/organization-member-access';

/**
 * Class MaintenanceCostCommandRepository
 * @class MaintenanceCostCommandRepository
 *
 * @description
 * Account-bound journal of immutable expense and rate intentions, committed before transmission.
 */
@Service()
export class MaintenanceCostCommandRepository extends IndexedDbService {
  //#region Properties
  /**
   * Property schema
   * @readonly
   *
   * @description
   * Independent private finance database requires no migration of another feature's records.
   *
   * @access protected
   * @since unreleased
   *
   * @type {IndexedDbSchema}
   */
  protected readonly schema: IndexedDbSchema = {
    name: 'fireguard-maintenance-cost-commands',
    version: 1,
    storeNames: ['metadata', 'commands'],
    ownerStoreName: 'metadata',
  };

  /**
   * Property member
   * @readonly
   *
   * @description
   * Active account and organization binding, without persisted credentials.
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
   * In-memory session generation fences asynchronous journal work.
   *
   * @access private
   * @since unreleased
   *
   * @type {AuthSessionPort}
   */
  private readonly session: AuthSessionPort = inject(AUTH_SESSION_PORT);

  /**
   * Property observedRevision
   *
   * @description
   * Last session generation observed by imperative work and the lifecycle effect.
   *
   * @access private
   * @since unreleased
   *
   * @type {number}
   */
  private observedRevision: number = this.session.sessionRevision();

  /**
   * Property writes
   *
   * @description
   * Serializes account binding, immutable intentions and logout purges.
   *
   * @access private
   * @since unreleased
   *
   * @type {Promise<void>}
   */
  private writes: Promise<void> = Promise.resolve();

  /**
   * Property purgeRequired
   *
   * @description
   * Failed session purges stay mandatory before any subsequent private recovery or transmission.
   *
   * @access private
   * @since unreleased
   *
   * @type {boolean}
   */
  private purgeRequired: boolean = false;
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Retains reload recovery but purges private facts when an established session is replaced.
   *
   * @access public
   * @since unreleased
   */
  public constructor() {
    super();
    effect(() => this.synchronizeSession());
  }
  //#endregion

  //#region Methods
  /**
   * Method synchronizeSession
   * @method synchronizeSession
   *
   * @description
   * Starts a mandatory purge immediately when imperative work observes session replacement.
   *
   * @access private
   * @since unreleased
   *
   * @returns {void} No return value.
   */
  private synchronizeSession(): void {
    const next = this.session.sessionRevision();
    if (!this.browser || this.observedRevision === next) return;
    this.observedRevision = next;
    this.purgeRequired = true;
    this.writes = this.writes
      .catch(() => undefined)
      .then(async () => {
        await this.resetOwnerData();
        this.purgeRequired = false;
      });
    void this.writes.catch(() => undefined);
  }

  /**
   * Method captureOwner
   * @method captureOwner
   *
   * @description
   * Captures a non-secret actor identity for read and response fences in the owning store.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} organizationId - Displayed organization.
   * @param {number} revision - Displayed session generation.
   *
   * @returns {string | null} Current actor, or no authorized membership.
   */
  public captureOwner(organizationId: string, revision: number): string | null {
    const userId = this.member.profile()?.userId ?? null;
    return this.isCurrent(organizationId, revision, userId) ? userId : null;
  }

  /**
   * Method isCurrent
   * @method isCurrent
   *
   * @description
   * Rechecks account, membership, organization and the captured local session generation.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} organizationId - Original organization.
   * @param {number} revision - Original session generation.
   * @param {string | null} userId - Original account.
   *
   * @returns {boolean} Whether journal work still belongs to the active actor.
   */
  public isCurrent(organizationId: string, revision: number, userId: string | null): boolean {
    const profile = this.member.profile();
    return (
      this.browser &&
      this.session.isAuthenticated() &&
      revision === this.session.sessionRevision() &&
      !!profile?.isActive &&
      profile.organizationId === organizationId &&
      profile.userId === userId
    );
  }

  /**
   * Method readPending
   * @method readPending
   *
   * @description
   * Hydrates only this account's original dossier or organization rate; never auto-sends facts.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} organizationId - Active organization.
   * @param {string | null} interventionId - Active financial dossier.
   *
   * @returns {Promise<MaintenanceCostCommand | null>} Unresolved immutable intention.
   */
  public async readPending(
    organizationId: string,
    interventionId: string | null,
  ): Promise<MaintenanceCostCommand | null> {
    this.synchronizeSession();
    const userId = this.member.profile()?.userId ?? null;
    const revision = this.session.sessionRevision();
    const current = () => this.isCurrent(organizationId, revision, userId);
    if (!current() || !userId) return null;
    await this.writes.catch(() => undefined);
    if (this.purgeRequired) {
      await this.resetOwnerData();
      this.purgeRequired = false;
    }
    await this.ensureOwnerBound(userId);
    if (!current()) return null;
    const commands = await this.getAll<{
      readonly userId: string;
      readonly command: MaintenanceCostCommand;
    }>('commands');
    if (!current()) return null;
    return (
      commands.find(
        (entry) =>
          entry.userId === userId &&
          entry.command.organizationId === organizationId &&
          (entry.command.kind === 'rate' ||
            (entry.command.kind === 'expense' && entry.command.interventionId === interventionId)),
      )?.command ?? null
    );
  }

  /**
   * Method retain
   * @method retain
   *
   * @description
   * Freezes physical facts before network work and rejects a changed payload under an existing
   * UUID.
   *
   * @access public
   * @since unreleased
   *
   * @param {MaintenanceCostCommand} command - Original exact intention.
   *
   * @returns {Promise<void>} Durable acceptance, or an explicit ownership/storage failure.
   */
  public retain(command: MaintenanceCostCommand): Promise<void> {
    this.synchronizeSession();
    if (command.kind !== 'expense' && command.kind !== 'rate') return Promise.resolve();
    const frozen = structuredClone(command);
    const userId = this.member.profile()?.userId ?? null;
    const revision = this.session.sessionRevision();
    const current = () => this.isCurrent(frozen.organizationId, revision, userId);
    const retained = this.writes
      .catch(() => undefined)
      .then(async () => {
        if (!current() || !userId) throw new Error('Financial command ownership changed.');
        if (this.purgeRequired) {
          await this.resetOwnerData();
          this.purgeRequired = false;
        }
        await this.ensureOwnerBound(userId);
        if (!current()) throw new Error('Financial command ownership changed.');
        const key = `${frozen.kind}:${frozen.input.clientId}`;
        const record = { userId, command: frozen };
        const previous = await this.get('commands', key);
        if (previous && JSON.stringify(previous) !== JSON.stringify(record))
          throw new Error('Financial command identity belongs to a different intention.');
        if (previous) return;
        await this.put('commands', key, record, current);
      });
    this.writes = retained;
    return retained;
  }

  /**
   * Method acknowledge
   * @method acknowledge
   *
   * @description
   * Removes a resolved intention only from its original active account and session.
   *
   * @access public
   * @since unreleased
   *
   * @param {MaintenanceCostCommand} command - Confirmed or definitively refused intention.
   * @param {number} revision - Original session generation.
   * @param {string | null} userId - Original actor captured before transmission.
   *
   * @returns {Promise<void>} Durable acknowledgement.
   */
  public acknowledge(
    command: MaintenanceCostCommand,
    revision: number,
    userId: string | null = this.member.profile()?.userId ?? null,
  ): Promise<void> {
    this.synchronizeSession();
    if (command.kind !== 'expense' && command.kind !== 'rate') return Promise.resolve();
    const current = () => this.isCurrent(command.organizationId, revision, userId);
    const acknowledged = this.writes
      .catch(() => undefined)
      .then(async () => {
        if (current())
          await this.remove('commands', `${command.kind}:${command.input.clientId}`, current);
      });
    this.writes = acknowledged;
    return acknowledged;
  }
  //#endregion
}
