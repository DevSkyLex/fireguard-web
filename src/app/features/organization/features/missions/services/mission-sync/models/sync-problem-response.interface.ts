/**
 * RFC 7807 response shape relevant to outbox synchronization.
 */
export interface SyncProblemResponse {
  readonly status?: number;
  readonly type?: string;
  readonly detail?: string;
  readonly error?: {
    readonly type?: string;
    readonly detail?: string;
  };
}
