import { inject, Service } from '@angular/core';
import { IndexedDbService, type IndexedDbSchema } from '@core/indexed-db';
import { USER_IDENTITY_PORT, type UserIdentityPort } from '@features/account/ports';
import {
  INTERVENTION_DATABASE_NAME,
  INTERVENTION_DATABASE_VERSION,
  INTERVENTION_STORE_NAMES,
} from './constants';

/**
 * Stores an earlier version created and this one no longer wants.
 *
 * `snapshots` predates the normalized intervention/workItems/changes split.
 */
const INTERVENTION_RETIRED_STORE_NAMES: readonly string[] = ['snapshots'];

/**
 * Service InterventionDatabaseService
 * @class InterventionDatabaseService
 * @extends {IndexedDbService}
 *
 * @description
 * The interventions feature's local database: its schema, plus the one thing
 * `core` cannot do for it — resolving the authenticated user whose data the
 * stores belong to.
 *
 * Everything else (connection, CRUD primitives, owner binding, SSR guard) is
 * inherited. `core` must not depend on a feature, so the base class takes the
 * owner id as a parameter and this subclass supplies it from the account
 * feature's identity port.
 *
 * @version 2.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Service()
export class InterventionDatabaseService extends IndexedDbService {
  //#region Properties
  /**
   * Method currentOwnerId
   * @method currentOwnerId
   * @description Identifies the account owning local operations without reading persisted credentials.
   * @access public
   * @since 1.0.0
   * @returns {string | null} Authenticated subject, or null.
   */
  public currentOwnerId(): string | null {
    return this.identity.profile()?.id ?? this.identity.profile()?.sub ?? null;
  }

  /**
   * Property schema
   * @readonly
   *
   * @description
   * The `fireguard-field-interventions` database.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {IndexedDbSchema}
   */
  protected readonly schema: IndexedDbSchema = {
    name: INTERVENTION_DATABASE_NAME,
    version: INTERVENTION_DATABASE_VERSION,
    storeNames: INTERVENTION_STORE_NAMES,
    retiredStoreNames: INTERVENTION_RETIRED_STORE_NAMES,
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
   * The default is what every caller relies on — repositories call this with
   * no argument before each read or write.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string | null} [userId] - User to bind; defaults to the current profile subject.
   *
   * @return {Promise<void>} A promise resolving once local stores are bound to the user.
   */
  public override ensureOwnerBound(userId: string | null = this.currentOwnerId()): Promise<void> {
    return super.ensureOwnerBound(userId);
  }
  //#endregion
}
