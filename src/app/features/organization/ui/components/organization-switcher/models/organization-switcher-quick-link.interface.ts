/**
 * Interface OrganizationSwitcherQuickLink
 * @interface OrganizationSwitcherQuickLink
 *
 * @description
 * One resolved admin destination in the switcher menu, gated by permission and
 * already carrying the active organization's route prefix.
 *
 * @since 3.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface OrganizationSwitcherQuickLink {
  /** Stable identifier, also the i18n and icon lookup key. */
  readonly id: string;
  /** Display label. */
  readonly label: string;
  /** Registered lucide icon name. */
  readonly icon: string;
  /** Destination, already prefixed with `/organizations/:organizationId`. */
  readonly route: string;
  /** Extra query parameters the destination needs, or `null`. */
  readonly queryParams: Readonly<Record<string, string>> | null;
}
