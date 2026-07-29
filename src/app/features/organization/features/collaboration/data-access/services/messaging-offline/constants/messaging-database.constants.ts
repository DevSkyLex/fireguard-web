/**
 * Constant MESSAGING_DATABASE_NAME
 *
 * @description
 * Name of the messaging feature's local database.
 *
 * Deliberately **not** `fireguard-field-interventions`: that database's owner
 * binding purges every store when the authenticated user changes, and sharing
 * it would let an intervention-side purge take the member's queued messages
 * with it.
 *
 * @since 1.0.0
 *
 * @type {string}
 */
export const MESSAGING_DATABASE_NAME: string = 'fireguard-messaging';

/**
 * Constant MESSAGING_DATABASE_VERSION
 *
 * @description
 * Schema version. Bump it whenever the store list changes.
 *
 * @since 1.0.0
 *
 * @type {number}
 */
export const MESSAGING_DATABASE_VERSION: number = 1;

/**
 * Constant MESSAGING_STORE_NAMES
 *
 * @description
 * Every object store the messaging database owns.
 *
 * `metadata` holds the owner binding and nothing the feature clears on its own.
 *
 * @since 1.0.0
 *
 * @type {readonly string[]}
 */
export const MESSAGING_STORE_NAMES: readonly string[] = ['outbox', 'metadata'];
