/**
 * Approval-request transport fixtures for the e2e suite, mirroring the
 * backend contract consumed by the approvals inbox. Plain factory functions
 * (like `equipment-fixtures.ts`), so tests override fields via object spread.
 */

import { E2E_ORGANIZATION_ID } from './api-fixtures';

/** The approval request the filter e2e scenario reads. */
export const E2E_APPROVAL_REQUEST_ID = 'e2e-approval-1';

export interface ApprovalRequestOutputFixture {
  readonly '@id': string;
  readonly '@type': string;
  readonly id: string;
  readonly organizationId: string;
  readonly actionType: string;
  readonly subjectId: string;
  readonly status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'expired';
  readonly requestedByMemberId: string;
  readonly requestedByUserId: string;
  readonly expiresAt: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** A pending non-conformity waiver request, awaiting a decision. */
export function approvalRequestOutput(
  overrides: Partial<ApprovalRequestOutputFixture> = {},
): ApprovalRequestOutputFixture {
  return {
    '@id': `/api/approval-requests/${E2E_APPROVAL_REQUEST_ID}`,
    '@type': 'ApprovalRequest',
    id: E2E_APPROVAL_REQUEST_ID,
    organizationId: E2E_ORGANIZATION_ID,
    actionType: 'nc_waiver',
    subjectId: 'e2e-non-conformity-1',
    status: 'pending',
    requestedByMemberId: 'e2e-member-1',
    requestedByUserId: 'e2e-user-1',
    expiresAt: '2026-09-01T00:00:00+00:00',
    createdAt: '2026-08-01T00:00:00+00:00',
    updatedAt: '2026-08-01T00:00:00+00:00',
    ...overrides,
  };
}

export interface ApprovalActionTypeOutputFixture {
  readonly '@id': string;
  readonly '@type': string;
  readonly value: string;
  readonly label: string;
}

/** The single regulated action type the filter e2e scenario picks. */
export function approvalActionTypeOutput(
  overrides: Partial<ApprovalActionTypeOutputFixture> = {},
): ApprovalActionTypeOutputFixture {
  return {
    '@id': '/api/approvals/action-types/nc_waiver',
    '@type': 'ApprovalActionType',
    value: 'nc_waiver',
    label: 'Non-conformity waiver',
    ...overrides,
  };
}
