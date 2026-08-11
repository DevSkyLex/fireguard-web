import type { SetupFacilityType } from '@features/organization/setup';

/**
 * Interface OnboardingFacilityDraft
 * @interface OnboardingFacilityDraft
 *
 * @description
 * The Signal Forms model for the single facility row currently being edited
 * before it is staged into the list the step ultimately submits.
 *
 * @since 1.0.0
 */
export interface OnboardingFacilityDraft {
  /** The facility type, or an empty string until one is picked. */
  readonly type: SetupFacilityType | '';

  /** Display name of the facility. */
  readonly name: string;

  /** Optional postal or freeform address. */
  readonly address: string;
}
