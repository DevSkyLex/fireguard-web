/**
 * Interface OrganizationSwitcherOption
 * @interface OrganizationSwitcherOption
 *
 * @description
 * One organization as the switcher renders it: everything the trigger and the
 * menu row need, already derived, so the template branches on nothing.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface OrganizationSwitcherOption {
  /** Organization identifier, used to build the destination route. */
  readonly id: string;
  /** Display name. */
  readonly name: string;
  /** Up to two initials, shown when no logo is available. */
  readonly initials: string;
  /** Logo URL, or `null` when the organization has none. */
  readonly logoUrl: string | null;
  /** Plan name, shown as the secondary line; `null` when the plan is unknown. */
  readonly planName: string | null;
  /** Whether this is the organization the URL currently designates. */
  readonly active: boolean;
}
