import type { Signal } from '@angular/core';
import type { PresenceStatus } from '@features/organization/models';

/**
 * Interface MemberPresencePort
 * @interface MemberPresencePort
 * @description Session-scoped availability of members in the selected organization. Consumers own registrations.
 * @since 1.0.0
 */
export interface MemberPresencePort {
  /**
   * Property byId
   * @readonly
   * @description Fresh confirmed statuses, indexed by bare member UUID; missing keys are unknown.
   * @access public
   * @since 1.0.0
   * @type {Signal<Readonly<Record<string, PresenceStatus>>>}
   */
  readonly byId: Signal<Readonly<Record<string, PresenceStatus>>>;
  /**
   * Property ownStatus
   * @readonly
   * @description Current member's acknowledged presence; null before acknowledgment or without an organization.
   * @access public
   * @since 1.0.0
   * @type {Signal<PresenceStatus | null>}
   */
  readonly ownStatus: Signal<PresenceStatus | null>;
  /**
   * Method register
   * @method register
   * @description Replaces this consumer's requested members without replacing other consumers' registrations.
   * @access public
   * @since 1.0.0
   * @param {object} owner - Stable consumer identity.
   * @param {readonly string[]} memberIds - Bare UUIDs or member IRIs in the current organization.
   * @returns {void}
   */
  register(owner: object, memberIds: readonly string[]): void;
  /**
   * Method unregister
   * @method unregister
   * @description Releases one consumer's registration when its surface closes or is destroyed.
   * @access public
   * @since 1.0.0
   * @param {object} owner - Identity supplied to register.
   * @returns {void}
   */
  unregister(owner: object): void;
}
