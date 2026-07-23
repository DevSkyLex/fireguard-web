/**
 * Interface OrganizationRailTile
 * @interface OrganizationRailTile
 *
 * @description
 * View model for one organization tile in the workspace rail.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface OrganizationRailTile {
  /** Organization identifier, used to build the workspace route. */
  readonly id: string;
  /** Organization name, announced as the tile's accessible label and tooltip. */
  readonly name: string;
  /** Up to two uppercase initials, shown when no logo is available. */
  readonly initials: string;
  /** Organization logo, or `null` when the API omitted it. */
  readonly logoUrl: string | null;
  /** Whether this organization is the one currently open. */
  readonly active: boolean;
}
