/**
 * Interface ChannelNavRow
 * @interface ChannelNavRow
 *
 * @description
 * View model for one channel row in the workspace sidebar.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface ChannelNavRow {
  /** Bare channel UUID. */
  readonly id: string;
  readonly name: string;
  /** Whether the row renders indented under a parent channel. */
  readonly nested: boolean;
  /** Unread total, or `null` when there is nothing to show. */
  readonly unreadCount: number | null;
  /** Router commands, workspace-scoped so a click stays inside the shell. */
  readonly link: readonly string[];
}
