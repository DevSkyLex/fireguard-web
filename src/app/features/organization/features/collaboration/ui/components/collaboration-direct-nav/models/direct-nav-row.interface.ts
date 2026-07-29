/**
 * Interface DirectNavRow
 * @interface DirectNavRow
 *
 * @description
 * View model for one direct-conversation row in the workspace sidebar.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface DirectNavRow {
  /** Bare conversation UUID. */
  readonly id: string;
  /** Counterpart display name. */
  readonly name: string;
  /** Avatar initials derived from the name. */
  readonly initials: string;
  /** Unread total, or `null` when there is nothing to show. */
  readonly unreadCount: number | null;
  /** Router commands, workspace-scoped so a click stays inside the shell. */
  readonly link: readonly string[];
}
