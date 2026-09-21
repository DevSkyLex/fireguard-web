/**
 * Interface FailedMessageItem
 * @interface FailedMessageItem
 * @description A locally failed send whose conversation is still readable in the selected organization.
 * @since 1.0.0
 */
export interface FailedMessageItem {
  readonly id: string;
  readonly body: string;
  readonly createdAt: string;
  readonly conversationLabel: string;
  readonly link: readonly string[];
}
