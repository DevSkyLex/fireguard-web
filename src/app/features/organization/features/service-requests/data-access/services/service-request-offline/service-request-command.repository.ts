import { effect, inject, Service } from '@angular/core';
import { IndexedDbService, type IndexedDbSchema } from '@core/indexed-db';
import { AUTH_SESSION_PORT, type AuthSessionPort } from '@features/auth/ports';
import type { ServiceRequestConversionCommand } from '@features/organization/features/service-requests/models';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import {
  ORGANIZATION_MEMBER_ACCESS_PORT,
  type OrganizationMemberAccessPort,
} from '@features/organization/ports/organization-member-access';

/**
 * Class ServiceRequestCommandRepository
 * @class ServiceRequestCommandRepository
 *
 * @description
 * Root account-bound journal retains exact conversions across route destruction and browser reload.
 */
@Service()
export class ServiceRequestCommandRepository extends IndexedDbService {
  //#region Properties
  /**
   * Property schema
   * @readonly
   *
   * @description
   * Independent database avoids changing other features' offline schemas.
   *
   * @access protected
   * @since unreleased
   *
   * @type {IndexedDbSchema}
   */
  protected readonly schema: IndexedDbSchema = {
    name: 'fireguard-service-requests',
    version: 1,
    storeNames: ['metadata', 'commands'],
    ownerStoreName: 'metadata',
  };

  /**
   * Property member
   * @readonly
   *
   * @description
   * Published active membership supplies account, organization and effective permissions.
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
   * Session generation fences asynchronous work without persisting tokens.
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
   * Serializes durable acceptance, acknowledgment and session purges.
   *
   * @access private
   * @since unreleased
   *
   * @type {Promise<void>}
   */
  private writes: Promise<void> = Promise.resolve();

  /**
   * Property observedRevision
   *
   * @description
   * Last authentication generation synchronously observed by lifecycle and journal operations.
   *
   * @access private
   * @since unreleased
   *
   * @type {number}
   */
  private observedRevision: number = this.session.sessionRevision();

  /**
   * Property observedAuthenticated
   *
   * @description
   * Detects authenticated session loss even before its scheduled effect executes.
   *
   * @access private
   * @since unreleased
   *
   * @type {boolean}
   */
  private observedAuthenticated: boolean = this.session.isAuthenticated();

  /**
   * Property observedUserId
   *
   * @description
   * Retains the last known account across transient organization access loading.
   *
   * @access private
   * @since unreleased
   *
   * @type {string | null}
   */
  private observedUserId: string | null = this.member.profile()?.userId ?? null;

  /**
   * Property purgeRequired
   *
   * @description
   * Failed purges remain mandatory before any subsequent private read or accepted conversion.
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
   * Keeps lifecycle purges active after a page leaves while preserving a same-account reload
   * journal.
   *
   * @access public
   * @since unreleased
   */
  public constructor() {
    super();
    effect(() => this.observeContext());
  }
  //#endregion

  //#region Methods
  /**
   * Method sessionRevision
   * @method sessionRevision
   *
   * @description
   * Captures the local authentication generation before asynchronous work begins.
   *
   * @access public
   * @since unreleased
   *
   * @returns {number} Current session generation.
   */
  public sessionRevision(): number {
    this.observeContext();
    return this.session.sessionRevision();
  }

  /**
   * Method isCurrent
   * @method isCurrent
   *
   * @description
   * Exact replay requires current active membership and request management; planning is checked for
   * new work by the caller and the server.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} userId - Original command account.
   * @param {string} organizationId - Original command organization.
   * @param {number} revision - Authentication generation captured by the caller.
   *
   * @returns {boolean} Whether the original command authority still applies.
   */
  public isCurrent(userId: string, organizationId: string, revision: number): boolean {
    this.observeContext();
    const profile = this.member.profile();
    return (
      this.browser &&
      this.session.isAuthenticated() &&
      this.session.sessionRevision() === revision &&
      !!profile?.isActive &&
      profile.userId === userId &&
      profile.organizationId === organizationId &&
      this.member.permissions().includes(ORGANIZATION_PERMISSION.SERVICE_REQUESTS_MANAGE)
    );
  }

  /**
   * Method readPending
   * @method readPending
   *
   * @description
   * Restores only the active account and organization; reading never transmits a command.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} userId - Authenticated account.
   * @param {string} organizationId - Active organization.
   *
   * @returns {Promise<readonly ServiceRequestConversionCommand[]>} Exact unresolved conversions.
   */
  public async readPending(
    userId: string,
    organizationId: string,
  ): Promise<readonly ServiceRequestConversionCommand[]> {
    const revision: number = this.sessionRevision();
    if (!this.isCurrent(userId, organizationId, revision)) return [];
    await this.writes.catch(() => undefined);
    await this.purge();
    if (!this.isCurrent(userId, organizationId, revision)) return [];
    await this.ensureOwnerBound(userId);
    if (!this.isCurrent(userId, organizationId, revision)) return [];
    const commands = await this.getAll<ServiceRequestConversionCommand>('commands');
    return this.isCurrent(userId, organizationId, revision)
      ? commands.filter(
          (command) => command.userId === userId && command.organizationId === organizationId,
        )
      : [];
  }

  /**
   * Method retain
   * @method retain
   *
   * @description
   * Commits the immutable UUID and original body before any network transmission.
   *
   * @access public
   * @since unreleased
   *
   * @param {ServiceRequestConversionCommand} command - Original accepted conversion.
   * @param {number} revision - Authentication generation captured before acceptance.
   *
   * @returns {Promise<void>} Durable acceptance or an explicit storage/ownership failure.
   */
  public retain(
    command: ServiceRequestConversionCommand,
    revision: number = this.sessionRevision(),
  ): Promise<void> {
    this.observeContext();
    const current = () => this.isCurrent(command.userId, command.organizationId, revision);
    const retained = this.writes
      .catch(() => undefined)
      .then(async () => {
        if (!current()) throw new Error('Maintenance conversion ownership changed.');
        await this.purge();
        if (!current()) throw new Error('Maintenance conversion ownership changed.');
        await this.ensureOwnerBound(command.userId);
        if (!current()) throw new Error('Maintenance conversion ownership changed.');
        const id: string = command.input.clientOperationId;
        const previous = await this.get<ServiceRequestConversionCommand>('commands', id);
        if (!current()) throw new Error('Maintenance conversion ownership changed.');
        if (previous) {
          if (JSON.stringify(previous) !== JSON.stringify(command))
            throw new Error(
              'Maintenance conversion UUID already belongs to a different intention.',
            );
          return;
        }
        await this.put('commands', id, command, current);
      });
    this.writes = retained.catch(() => undefined);
    return retained;
  }

  /**
   * Method acknowledge
   * @method acknowledge
   *
   * @description
   * Removes a confirmed conversion only while its original account authority remains current.
   *
   * @access public
   * @since unreleased
   *
   * @param {ServiceRequestConversionCommand} command - Confirmed conversion.
   * @param {number} revision - Original authentication generation.
   *
   * @returns {Promise<void>} Completion of the serialized journal update.
   */
  public acknowledge(command: ServiceRequestConversionCommand, revision: number): Promise<void> {
    this.observeContext();
    const current = () => this.isCurrent(command.userId, command.organizationId, revision);
    const acknowledged = this.writes
      .catch(() => undefined)
      .then(async () => {
        if (!current()) return;
        await this.purge();
        if (!current()) return;
        await this.remove('commands', command.input.clientOperationId, current);
      });
    this.writes = acknowledged.catch(() => undefined);
    return acknowledged;
  }

  /**
   * Method observeContext
   * @method observeContext
   *
   * @description
   * Marks session replacement synchronously, so a new login cannot race the scheduled purge effect.
   *
   * @access private
   * @since unreleased
   *
   * @returns {void} Queues the required purge without starting a transmission.
   */
  private observeContext(): void {
    const revision: number = this.session.sessionRevision();
    const authenticated: boolean = this.session.isAuthenticated();
    const userId: string | null = this.member.profile()?.userId ?? null;
    const replaced: boolean =
      this.observedRevision !== revision ||
      (this.observedAuthenticated && !authenticated) ||
      (this.observedUserId !== null && userId !== null && this.observedUserId !== userId);
    this.observedRevision = revision;
    this.observedAuthenticated = authenticated;
    if (userId !== null) this.observedUserId = userId;
    if (!this.browser || !replaced) return;
    this.purgeRequired = true;
    this.writes = this.writes.catch(() => undefined).then(() => this.purge());
    void this.writes.catch(() => undefined);
  }

  /**
   * Method purge
   * @method purge
   *
   * @description
   * Retries a required owner purge; a failed clear never reopens access to old session commands.
   *
   * @access private
   * @since unreleased
   *
   * @returns {Promise<void>} Completion of the required purge or its explicit storage error.
   */
  private async purge(): Promise<void> {
    if (!this.purgeRequired) return;
    const revision: number = this.observedRevision;
    await this.resetOwnerData();
    if (revision === this.observedRevision) this.purgeRequired = false;
  }
  //#endregion
}
