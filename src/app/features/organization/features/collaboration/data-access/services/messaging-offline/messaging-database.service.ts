import { inject, Service } from '@angular/core';
import { IndexedDbService, type IndexedDbSchema } from '@core/indexed-db';
import { USER_IDENTITY_PORT, type UserIdentityPort } from '@features/account/ports';
import {
  MESSAGING_DATABASE_NAME,
  MESSAGING_DATABASE_VERSION,
  MESSAGING_STORE_NAMES,
} from './constants';

/**
 * Service MessagingDatabaseService
 * @class MessagingDatabaseService
 * @extends {IndexedDbService}
 *
 * @description
 * The messaging feature's local database: its schema, plus the authenticated
 * user whose queued work the stores belong to.
 *
 * Everything else is inherited from `core`. It is a **separate database** from
 * the interventions one on purpose — see {@link MESSAGING_DATABASE_NAME}.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Service()
export class MessagingDatabaseService extends IndexedDbService {
  //#region Properties
  /**
   * Property schema
   * @readonly
   *
   * @description
   * The `fireguard-messaging` database.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {IndexedDbSchema}
   */
  protected readonly schema: IndexedDbSchema = {
    name: MESSAGING_DATABASE_NAME,
    version: MESSAGING_DATABASE_VERSION,
    storeNames: MESSAGING_STORE_NAMES,
    ownerStoreName: 'metadata',
  };

  /**
   * Property identity
   * @readonly
   *
   * @description
   * Identity port exposing the authenticated user profile.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {UserIdentityPort}
   */
  private readonly identity: UserIdentityPort = inject<UserIdentityPort>(USER_IDENTITY_PORT);
  //#endregion

  //#region Methods
  /**
   * Method ensureOwnerBound
   * @method ensureOwnerBound
   *
   * @description
   * Binds the local stores to a user, defaulting to the currently
   * authenticated one.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string | null} [userId] - User to bind; defaults to the current profile subject.
   *
   * @return {Promise<void>} A promise resolving once local stores are bound.
   */
  public override ensureOwnerBound(
    userId: string | null = this.identity.profile()?.sub ?? null,
  ): Promise<void> {
    return super.ensureOwnerBound(userId);
  }
  //#endregion
}
