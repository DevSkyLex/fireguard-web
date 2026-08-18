/**
 * API response fixtures matching the backend transport contracts consumed by
 * `HydraApiService`. Kept as plain factory functions (not classes) so tests
 * can override individual fields with object spread.
 *
 * Hydra collections use plain `member` / `totalItems` keys (not the
 * `hydra:member` JSON-LD form) — see `core/api/models/hydra-collection.interface.ts`.
 */

/** Organization the equipment/facility/inspection/onboarding e2e scenarios run against. */
export const E2E_ORGANIZATION_ID = 'e2e-org-1';

export interface LoginOutputFixture {
  readonly '@id': string;
  readonly '@type': string;
  readonly access_token: string;
  readonly token_type: 'Bearer';
  readonly expires_in: number;
  readonly scope?: string | null;
  readonly mfa_required?: boolean | null;
  readonly mfa_token?: string | null;
  readonly challenge_token?: string | null;
  readonly mfa_method?: 'email' | 'sms' | 'totp' | null;
  readonly mfa_destination?: string | null;
  readonly mfa_resend_in?: number | null;
}

export function loginOutput(overrides: Partial<LoginOutputFixture> = {}): LoginOutputFixture {
  return {
    '@id': '/api/auth/login',
    '@type': 'Token',
    access_token: 'e2e-access-token',
    token_type: 'Bearer',
    expires_in: 3600,
    scope: 'openid profile email',
    ...overrides,
  };
}

export interface UserProfileOutputFixture {
  readonly '@id': string;
  readonly '@type': string;
  readonly id: string;
  readonly username: string;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly avatarUrl: string | null;
  readonly status: string;
  readonly emailVerified: boolean;
  readonly tenantId: string | null;
  readonly createdAt: string;
  readonly lastLoginAt: string;
  readonly roles: ReadonlyArray<string>;
  readonly permissions: ReadonlyArray<string>;
}

export function userProfileOutput(
  overrides: Partial<UserProfileOutputFixture> = {},
): UserProfileOutputFixture {
  return {
    '@id': '/api/me',
    '@type': 'User',
    id: 'e2e-user-1',
    username: 'e2e.user',
    email: 'e2e.user@fireguard.test',
    firstName: 'Ella',
    lastName: 'Uzer',
    avatarUrl: null,
    status: 'active',
    emailVerified: true,
    tenantId: 'e2e-tenant-1',
    createdAt: '2026-01-01T00:00:00+00:00',
    lastLoginAt: '2026-07-08T00:00:00+00:00',
    roles: ['ROLE_USER'],
    permissions: [],
    ...overrides,
  };
}

export interface HydraCollectionFixture<T> {
  readonly '@id': string;
  readonly '@type': string;
  readonly member: ReadonlyArray<T>;
  readonly totalItems: number;
}

export function hydraCollection<T>(
  member: ReadonlyArray<T> = [],
  overrides: Partial<HydraCollectionFixture<T>> = {},
): HydraCollectionFixture<T> {
  return {
    '@id': '/api/collection',
    '@type': 'Collection',
    member,
    totalItems: member.length,
    ...overrides,
  };
}

export type OnboardingStepKeyFixture =
  | 'create_organization'
  | 'select_plan'
  | 'invite_members'
  | 'create_first_facility'
  | 'create_first_equipment';

export interface OnboardingStepOutputFixture {
  readonly key: OnboardingStepKeyFixture;
  readonly label: string;
  readonly status: 'pending' | 'completed' | 'skipped' | 'blocked';
  readonly required: boolean;
  readonly available: boolean;
  readonly reason: string | null;
  readonly rollbackAvailable: boolean;
  readonly skippable: boolean;
  readonly skipAvailable: boolean;
  readonly completedAt: string | null;
}

export function onboardingStepOutput(
  overrides: Partial<OnboardingStepOutputFixture> = {},
): OnboardingStepOutputFixture {
  return {
    key: 'create_organization',
    label: 'Create your organization',
    status: 'pending',
    required: true,
    available: true,
    reason: null,
    rollbackAvailable: false,
    skippable: false,
    skipAvailable: false,
    completedAt: null,
    ...overrides,
  };
}

/** Every onboarding step, `pending` and untouched — the wizard's very first render. */
export const E2E_ONBOARDING_STEPS: ReadonlyArray<OnboardingStepOutputFixture> = [
  onboardingStepOutput({ key: 'create_organization', label: 'Create your organization' }),
  onboardingStepOutput({
    key: 'select_plan',
    label: 'Choose a plan',
    skippable: true,
    skipAvailable: false,
  }),
  onboardingStepOutput({
    key: 'invite_members',
    label: 'Invite your team',
    required: false,
    skippable: true,
    skipAvailable: false,
  }),
  onboardingStepOutput({
    key: 'create_first_facility',
    label: 'Add your first facility',
    required: false,
    skippable: true,
    skipAvailable: false,
  }),
  onboardingStepOutput({
    key: 'create_first_equipment',
    label: 'Register your first equipment',
    required: false,
    skippable: true,
    skipAvailable: false,
  }),
];

export interface OnboardingOutputFixture {
  readonly '@id': string;
  readonly '@type': string;
  readonly state: 'not_started' | 'in_progress' | 'blocked' | 'completed';
  readonly flow: string | null;
  readonly nextStep: OnboardingStepKeyFixture | null;
  readonly steps: ReadonlyArray<OnboardingStepOutputFixture>;
  readonly completedSteps: ReadonlyArray<OnboardingStepKeyFixture>;
  readonly skippedSteps: ReadonlyArray<OnboardingStepKeyFixture>;
  readonly dismissed: boolean;
  readonly canRollback: boolean;
  readonly blockedReason?: string | null;
  readonly targetOrganizationId: string | null;
  readonly targetOrganizationName: string | null;
}

/** An already-completed onboarding record — the default so most session bootstraps skip the wizard. */
export function onboardingOutput(
  overrides: Partial<OnboardingOutputFixture> = {},
): OnboardingOutputFixture {
  return {
    '@id': '/api/onboarding/organization',
    '@type': 'Onboarding',
    state: 'completed',
    flow: 'organization',
    nextStep: null,
    steps: [onboardingStepOutput({ status: 'completed' })],
    completedSteps: ['create_organization'],
    skippedSteps: [],
    dismissed: false,
    canRollback: false,
    targetOrganizationId: E2E_ORGANIZATION_ID,
    targetOrganizationName: 'E2E Organization',
    ...overrides,
  };
}

/** A brand-new, in-progress onboarding record sitting on its very first step. */
export function inProgressOnboardingOutput(
  overrides: Partial<OnboardingOutputFixture> = {},
): OnboardingOutputFixture {
  return onboardingOutput({
    state: 'in_progress',
    nextStep: 'create_organization',
    steps: E2E_ONBOARDING_STEPS,
    completedSteps: [],
    targetOrganizationId: null,
    targetOrganizationName: null,
    ...overrides,
  });
}

export interface OrganizationOutputFixture {
  readonly '@id': string;
  readonly '@type': string;
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly ownerUserId: string;
  readonly createdByUserId: string;
  readonly status: string;
  readonly isActive: boolean;
  readonly memberCount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export function organizationOutput(
  overrides: Partial<OrganizationOutputFixture> = {},
): OrganizationOutputFixture {
  return {
    '@id': `/api/organizations/${E2E_ORGANIZATION_ID}`,
    '@type': 'Organization',
    id: E2E_ORGANIZATION_ID,
    name: 'E2E Organization',
    slug: 'e2e-organization',
    ownerUserId: 'e2e-user-1',
    createdByUserId: 'e2e-user-1',
    status: 'active',
    isActive: true,
    memberCount: 1,
    createdAt: '2026-01-01T00:00:00+00:00',
    updatedAt: '2026-01-01T00:00:00+00:00',
    ...overrides,
  };
}

/**
 * Shared shape for the auth "challenge" flows — register, MFA, and
 * password-reset all return this same envelope from their request/resend
 * endpoints (`RegisterOutput`, `PasswordResetRequestOutput`,
 * `PasswordResetVerifyOutput`).
 */
export interface ChallengeOutputFixture {
  readonly '@id': string;
  readonly '@type': string;
  readonly success: boolean;
  readonly message: string;
  readonly challengeToken: string | null;
  readonly maskedRecipient: string | null;
  readonly expiresAt: string | null;
  readonly maxAttempts: number | null;
  readonly canResendIn: number | null;
}

export function challengeOutput(
  overrides: Partial<ChallengeOutputFixture> = {},
): ChallengeOutputFixture {
  return {
    '@id': '/api/auth/challenge',
    '@type': 'ChallengeOutput',
    success: true,
    message: 'Verification code sent.',
    challengeToken: 'e2e-challenge-token',
    maskedRecipient: 'e***r@f***d.test',
    expiresAt: null,
    maxAttempts: 5,
    canResendIn: 30,
    ...overrides,
  };
}

export interface CurrentOrganizationMemberProfileOutputFixture {
  readonly '@id': string;
  readonly '@type': string;
  readonly id: string;
  readonly organizationId: string;
  readonly userId: string;
  readonly isActive: boolean;
  readonly joinedAt: string;
  readonly roles: ReadonlyArray<{ readonly id: string; readonly name: string }>;
  readonly permissions: ReadonlyArray<{ readonly id: string; readonly name: string }>;
}

/**
 * All `ORGANIZATION_PERMISSION` catalog values
 * (`src/app/features/organization/models`), granted by default so a smoke
 * test can reach any permission-gated organization page. Pass `permissions`
 * to `currentOrganizationMemberProfileOutput` to scope down for a
 * guard-denial test.
 */
export const ALL_ORGANIZATION_PERMISSIONS: ReadonlyArray<string> = [
  'organization.dashboard.read',
  'organization.members.read',
  'organization.members.manage',
  'organization.roles.read',
  'organization.roles.manage',
  'organization.facilities.read',
  'organization.facilities.write',
  'organization.equipment.read',
  'organization.equipment.write',
  'organization.inspection.read',
  'organization.inspection.write',
  'organization.interventions.read',
  'organization.interventions.write',
  'organization.interventions.plan',
  'organization.interventions.execute',
  'organization.interventions.review',
  'organization.interventions.publish',
  'organization.messaging.read',
  'organization.messaging.write',
  'organization.messaging.manage',
  'organization.assistant.use',
  'organization.settings.write',
  'organization.compliance.read',
  'organization.compliance.export',
  'organization.maintenance.read',
  'organization.maintenance.manage',
  'organization.teams.read',
  'organization.teams.write',
  'organization.teams.manage',
  'organization.audit.read',
  'organization.approvals.read',
  'organization.approvals.request',
  'organization.approvals.decide',
  'organization.webhooks.read',
  'organization.webhooks.manage',
  'organization.delete',
];

export function currentOrganizationMemberProfileOutput(
  overrides: Partial<CurrentOrganizationMemberProfileOutputFixture> & {
    permissions?: ReadonlyArray<string>;
  } = {},
): CurrentOrganizationMemberProfileOutputFixture {
  const { permissions, ...rest } = overrides;
  const permissionNames: ReadonlyArray<string> = permissions ?? ALL_ORGANIZATION_PERMISSIONS;

  return {
    '@id': `/api/organizations/${E2E_ORGANIZATION_ID}/me`,
    '@type': 'OrganizationMemberProfile',
    id: 'e2e-member-1',
    organizationId: E2E_ORGANIZATION_ID,
    userId: 'e2e-user-1',
    isActive: true,
    joinedAt: '2026-01-01T00:00:00+00:00',
    roles: [{ id: 'e2e-role-owner', name: 'Owner' }],
    permissions: permissionNames.map((name, index) => ({ id: `e2e-permission-${index}`, name })),
    ...rest,
  };
}

export interface MercureSubscriptionOutputFixture {
  readonly topic: string;
  readonly token: string;
}

export function mercureSubscriptionOutput(
  overrides: Partial<MercureSubscriptionOutputFixture> = {},
): MercureSubscriptionOutputFixture {
  return {
    topic: '/e2e/user-1',
    token: 'e2e-mercure-token',
    ...overrides,
  };
}

export interface ApiErrorFixture {
  readonly '@id': string;
  readonly '@type': string;
  readonly status: number;
  readonly type: string;
  readonly title: string;
  readonly detail?: string;
}

export function apiError(overrides: Partial<ApiErrorFixture> = {}): ApiErrorFixture {
  return {
    '@id': '/errors/error',
    '@type': 'Error',
    status: 400,
    type: 'about:blank',
    title: 'An error occurred',
    ...overrides,
  };
}
