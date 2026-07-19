/**
 * One entry of the unified inbox.
 *
 * `organizationId` is **optional**: an item can be account-level, which is why
 * the inbox belongs to `features/account` rather than to a feature nested under
 * an organization.
 *
 * @since 1.0.0
 */
export interface InboxItem {
  readonly sourceKey: string;
  readonly id: string;
  readonly kind: string;
  readonly title: string;
  readonly snippet: string | null;
  readonly occurredAt: string;
  readonly isRead: boolean;
  readonly organizationId: string | null;
  readonly targetType: string;
  readonly targetId: string;
}
