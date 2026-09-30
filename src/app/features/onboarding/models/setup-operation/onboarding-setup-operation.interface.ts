import type {
  SetupCreateOrganizationInput,
  SetupInviteMemberInput,
  SetupCreateFacilityInput,
  SetupCreateEquipmentInput,
} from '@features/organization/setup';

/**
 * Type OnboardingSetupStep
 *
 * @description
 * Resource-producing steps recorded in the durable setup journal.
 *
 * @since 1.1.0
 *
 * @type {OnboardingSetupStep}
 */
export type OnboardingSetupStep =
  | 'create_organization'
  | 'invite_members'
  | 'create_first_facility'
  | 'create_first_equipment';

/**
 * Type OnboardingSetupPayload
 *
 * @description
 * Wire payloads accepted by the owning organization setup endpoints.
 *
 * @since 1.1.0
 *
 * @type {OnboardingSetupPayload}
 */
export type OnboardingSetupPayload =
  | SetupCreateOrganizationInput
  | SetupInviteMemberInput
  | SetupCreateFacilityInput
  | (Omit<SetupCreateEquipmentInput, 'facilityId'> & { readonly facility?: string | null });

/**
 * Interface OnboardingSetupItem
 * @interface OnboardingSetupItem
 *
 * @description
 * Stable item identity and its immutable prepared creation payload.
 *
 * @since 1.1.0
 */
export interface OnboardingSetupItem {
  /**
   * Property itemKey
   * @readonly
   *
   * @description
   * Stable client-generated key used to match a prepared item to its receipt.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly itemKey: string;

  /**
   * Property payload
   * @readonly
   *
   * @description
   * Immutable resource input persisted before the setup batch starts writing.
   *
   * @access public
   * @since unreleased
   *
   * @type {OnboardingSetupPayload}
   */
  readonly payload: OnboardingSetupPayload;
}

/**
 * Interface OnboardingSetupOperation
 * @interface OnboardingSetupOperation
 *
 * @description
 * Server-persisted creation result or pending item, scoped to one creator session.
 *
 * @since 1.1.0
 */
export interface OnboardingSetupOperation extends OnboardingSetupItem {
  /**
   * Property stepKey
   * @readonly
   *
   * @description
   * Setup step that owns this journal entry.
   *
   * @access public
   * @since unreleased
   *
   * @type {OnboardingSetupStep}
   */
  readonly stepKey: OnboardingSetupStep;

  /**
   * Property resourceId
   * @readonly
   *
   * @description
   * Created resource identifier, null while the operation remains prepared.
   *
   * @access public
   * @since unreleased
   *
   * @type {string | null}
   */
  readonly resourceId: string | null;

  /**
   * Property status
   * @readonly
   *
   * @description
   * Distinguishes a persisted pending item from one with a completed receipt.
   *
   * @access public
   * @since unreleased
   *
   * @type {'prepared' | 'completed'}
   */
  readonly status: 'prepared' | 'completed';
}

/**
 * Interface PrepareOnboardingSetupInput
 * @interface PrepareOnboardingSetupInput
 *
 * @description
 * The complete batch to persist before its individual resource writes begin.
 *
 * @since 1.1.0
 */
export interface PrepareOnboardingSetupInput {
  /**
   * Property sessionId
   * @readonly
   *
   * @description
   * Creator session that owns the durable setup journal.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly sessionId: string;

  /**
   * Property stepKey
   * @readonly
   *
   * @description
   * Current setup step associated with the prepared batch.
   *
   * @access public
   * @since unreleased
   *
   * @type {OnboardingSetupStep}
   */
  readonly stepKey: OnboardingSetupStep;

  /**
   * Property items
   * @readonly
   *
   * @description
   * Complete immutable batch persisted before any individual resource creation.
   *
   * @access public
   * @since unreleased
   *
   * @type {ReadonlyArray<OnboardingSetupItem>}
   */
  readonly items: readonly OnboardingSetupItem[];
}
