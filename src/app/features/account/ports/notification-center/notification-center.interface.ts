import type { Signal } from '@angular/core';

/**
 * Interface NotificationCenterPort
 * @interface NotificationCenterPort
 *
 * @description
 * NotificationCenterPort
 * Feature-owned contract published by the account feature for shell
 * consumers that need notification bootstrap state and unread badges.
 * Rich notification interactions remain internal to account UI/widgets.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface NotificationCenterPort {
  /**
   * Property revision
   * @readonly
   *
   * @description
   * Realtime invalidation counter; exposes no notification content.
   *
   * @type {Signal<number>}
   */
  readonly revision: Signal<number>;

  /**
   * Property unreadCount
   * @readonly
   *
   * @description
   * Current unread total exposed for shell badges.
   *
   * @access public
   * @since 0.1.0
   *
   * @type {Signal<number>}
   */
  readonly unreadCount: Signal<number>;

  /**
   * Property hasUnread
   * @readonly
   *
   * @description
   * True when the shell should show an unread-notification indicator.
   *
   * @access public
   * @since 0.1.0
   *
   * @type {Signal<boolean>}
   */
  readonly hasUnread: Signal<boolean>;

  /**
   * Method initialize
   * @method initialize
   *
   * @description
   * Initializes notification data for the active browser session.
   *
   * @access public
   * @since 0.1.0
   *
   * @returns {Promise<void>} Resolves when initialization completes.
   */
  initialize(): Promise<void>;

  /**
   * Method load
   * @method load
   *
   * @description
   * Requests the current notification page through the owning feature.
   *
   * @access public
   * @since 0.1.0
   *
   * @returns {void}
   */
  load(): void;

  /**
   * Method connectMercure
   * @method connectMercure
   *
   * @description
   * Starts the account-owned realtime notification subscription.
   *
   * @access public
   * @since 0.1.0
   *
   * @returns {void}
   */
  connectMercure(): void;
}
