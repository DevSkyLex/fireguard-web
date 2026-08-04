/**
 * Interface OrganizationSwitcherOption
 * @interface OrganizationSwitcherOption
 *
 * @description
 * One organization offered by the sidebar switcher, carrying what the row needs
 * to render without reaching back into the store.
 *
 * @version 1.0.0
 * @since 1.2.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface OrganizationSwitcherOption {
  /** Organization identifier, used to build the workspace route. */
  readonly id: string;
  /** Organization name, shown as the row label and the trigger's title. */
  readonly name: string;
  /** Up to two uppercase initials, shown when no logo is available. */
  readonly initials: string;
  /** Organization logo, or `null` when the API omitted it. */
  readonly logoUrl: string | null;
  /** Whether this organization is the one currently open. */
  readonly active: boolean;
}
