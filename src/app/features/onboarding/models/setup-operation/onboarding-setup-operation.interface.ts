import type {
  SetupCreateOrganizationInput,
  SetupInviteMemberInput,
  SetupCreateFacilityInput,
  SetupCreateEquipmentInput,
} from '@features/organization/setup';

/**
 * Type OnboardingSetupStep
 * @type {OnboardingSetupStep}
 * @description Resource-producing steps recorded in the durable setup journal.
 * @since 1.1.0
 */
export type OnboardingSetupStep =
  | 'create_organization'
  | 'invite_members'
  | 'create_first_facility'
  | 'create_first_equipment';

/**
 * Type OnboardingSetupPayload
 * @type {OnboardingSetupPayload}
 * @description Wire payloads accepted by the owning organization setup endpoints.
 * @since 1.1.0
 */
export type OnboardingSetupPayload =
  | SetupCreateOrganizationInput
  | SetupInviteMemberInput
  | SetupCreateFacilityInput
  | (Omit<SetupCreateEquipmentInput, 'facilityId'> & { readonly facility?: string | null });

/**
 * Interface OnboardingSetupItem
 * @interface OnboardingSetupItem
 * @description Stable item identity and its immutable prepared creation payload.
 * @since 1.1.0
 */
export interface OnboardingSetupItem {
  readonly itemKey: string;
  readonly payload: OnboardingSetupPayload;
}

/**
 * Interface OnboardingSetupOperation
 * @interface OnboardingSetupOperation
 * @description Server-persisted creation result or pending item, scoped to one creator session.
 * @since 1.1.0
 */
export interface OnboardingSetupOperation extends OnboardingSetupItem {
  readonly stepKey: OnboardingSetupStep;
  readonly resourceId: string | null;
  readonly status: 'prepared' | 'completed';
}

/**
 * Interface PrepareOnboardingSetupInput
 * @interface PrepareOnboardingSetupInput
 * @description The complete batch to persist before its individual resource writes begin.
 * @since 1.1.0
 */
export interface PrepareOnboardingSetupInput {
  readonly sessionId: string;
  readonly stepKey: OnboardingSetupStep;
  readonly items: readonly OnboardingSetupItem[];
}
