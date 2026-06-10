import type { AccountTab } from '../account-tab';

/**
 * Interface AccountNavItem
 * @interface AccountNavItem
 *
 * @description
 * Selectable account section rendered in the vertical navigation menu.
 *
 * @since 1.0.0
 */
export interface AccountNavItem {
  /**
   * Property id
   *
   * @description
   * Tab identifier persisted in the `tab` query parameter.
   *
   * @type {AccountTab}
   */
  readonly id: AccountTab;

  /**
   * Property label
   *
   * @description
   * Human-readable label shown in the navigation menu.
   *
   * @type {string}
   */
  readonly label: string;

  /**
   * Property icon
   *
   * @description
   * PrimeIcons class shown before the navigation label.
   *
   * @type {string}
   */
  readonly icon: string;
}
