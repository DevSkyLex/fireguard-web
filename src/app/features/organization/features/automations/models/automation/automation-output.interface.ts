import type { HydraItem } from '@core/api/models';

/**
 * Interface AutomationAttemptOutput
 * @interface AutomationAttemptOutput
 * @description One immutable attempt identity and its server-owned result.
 * @since 1.0.0
 */
export interface AutomationAttemptOutput extends HydraItem {
  readonly id: string;
  readonly runId: string;
  readonly organizationId: string;
  readonly ruleKey: string;
  readonly subjectId: string;
  readonly attemptNumber: number;
  readonly status: 'pending' | 'running' | 'failed' | 'succeeded' | 'skipped';
  readonly createdAt: string;
  readonly finishedAt: string | null;
  readonly requestedBy: string | null;
  readonly interventionId: string | null;
  readonly errorCode: string | null;
  readonly canRetry: boolean;
}

/**
 * Interface AutomationPolicyOutput
 * @interface AutomationPolicyOutput
 * @description Effective policy and server-authorized management capability.
 * @since 1.0.0
 */
export interface AutomationPolicyOutput extends HydraItem {
  readonly id: string;
  readonly ruleKey: string;
  readonly enabled: boolean;
  readonly canManage: boolean;
}
