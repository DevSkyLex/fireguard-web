import type {
  FacilityTypeOption,
  FacilityOutput,
  CreateFirstFacilityOnboardingInput,
  CreateOnboardingOrganizationInput,
  OrganizationLegalProfileOutput,
  OrganizationLegalTypeOption,
  OrganizationOnboardingStatusOutput,
  OrganizationOutput,
  UpsertOrganizationLegalProfileInput,
} from '@core/models/organization';
import type { Operation } from '@core/stores/operations';

/**
 * Interface OrganizationState
 * @interface OrganizationState
 *
 * @description
 * State interface for organization store.
 *
 * @version 1.0.0
 */
export interface OrganizationState {
  /**
   * Property organizationLegalTypeOptions
   * @readonly
   *
   * @description
   * Available legal type options for organization forms.
   *
   * @type {readonly OrganizationLegalTypeOption[]}
   */
  readonly organizationLegalTypeOptions: readonly OrganizationLegalTypeOption[];

  /**
   * Property organizationLegalTypeOptionsLoadOperation
   * @readonly
   *
   * @description
   * Async operation state for loading organization legal type options.
   *
   * @type {Operation<readonly OrganizationLegalTypeOption[], unknown>}
   */
  readonly organizationLegalTypeOptionsLoadOperation: Operation<
    readonly OrganizationLegalTypeOption[],
    unknown
  >;

  /**
   * Property facilityTypeOptions
   * @readonly
   *
   * @description
   * Available facility type options for facility forms.
   *
   * @type {readonly FacilityTypeOption[]}
   */
  readonly facilityTypeOptions: readonly FacilityTypeOption[];

  /**
   * Property facilityTypeOptionsLoadOperation
   * @readonly
   *
   * @description
   * Async operation state for loading facility type options.
   *
   * @type {Operation<readonly FacilityTypeOption[], unknown>}
   */
  readonly facilityTypeOptionsLoadOperation: Operation<
    readonly FacilityTypeOption[],
    unknown
  >;

  /**
   * Property onboardingStatus
   * @readonly
   *
   * @description
   * Latest onboarding status returned by backend.
   *
   * @type {OrganizationOnboardingStatusOutput | null}
   */
  readonly onboardingStatus: OrganizationOnboardingStatusOutput | null;

  /**
   * Property onboardingStatusLoadOperation
   * @readonly
   *
   * @description
   * Async operation state for loading onboarding status.
   *
   * @type {Operation<OrganizationOnboardingStatusOutput, unknown>}
   */
  readonly onboardingStatusLoadOperation: Operation<
    OrganizationOnboardingStatusOutput,
    unknown
  >;

  /**
   * Property onboardingOrganizationCreateOperation
   * @readonly
   *
   * @description
   * Async operation state for onboarding organization creation.
   *
   * @type {Operation<OrganizationOutput, unknown, CreateOnboardingOrganizationInput>}
   */
  readonly onboardingOrganizationCreateOperation: Operation<
    OrganizationOutput,
    unknown,
    CreateOnboardingOrganizationInput
  >;

  /**
   * Property onboardingLegalProfileUpsertOperation
   * @readonly
   *
   * @description
   * Async operation state for onboarding legal profile upsert.
   *
   * @type {Operation<OrganizationLegalProfileOutput, unknown, { organizationId: string; payload: UpsertOrganizationLegalProfileInput }>}
   */
  readonly onboardingLegalProfileUpsertOperation: Operation<
    OrganizationLegalProfileOutput,
    unknown,
    { organizationId: string; payload: UpsertOrganizationLegalProfileInput }
  >;

  /**
   * Property onboardingFirstFacilityCreateOperation
   * @readonly
   *
   * @description
   * Async operation state for onboarding first facility creation.
   *
   * @type {Operation<FacilityOutput, unknown, { organizationId: string; payload: CreateFirstFacilityOnboardingInput }>}
   */
  readonly onboardingFirstFacilityCreateOperation: Operation<
    FacilityOutput,
    unknown,
    { organizationId: string; payload: CreateFirstFacilityOnboardingInput }
  >;
}
