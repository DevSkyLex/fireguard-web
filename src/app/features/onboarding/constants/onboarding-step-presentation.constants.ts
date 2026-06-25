import type { OnboardingStepKey, OnboardingStepPresentation } from '@features/onboarding/models';

/**
 * Constant ONBOARDING_STEP_PRESENTATION
 * @const ONBOARDING_STEP_PRESENTATION
 *
 * @description
 * Exhaustive, localized presentation metadata for every {@link OnboardingStepKey}:
 * a PrimeIcons name, a short title, and a one-line subtitle. Shared by the wizard
 * rail and the shell setup checklist so both render identical step copy. A typed
 * `Record` fails the build if a step key is added to the domain model without a
 * presentation entry.
 *
 * @since 2.1.0
 *
 * @type {Record<OnboardingStepKey, OnboardingStepPresentation>}
 */
export const ONBOARDING_STEP_PRESENTATION: Record<OnboardingStepKey, OnboardingStepPresentation> = {
  create_organization: {
    icon: 'pi-building',
    label: $localize`:@@onboarding.step.org.label:Create organization`,
    sublabel: $localize`:@@onboarding.step.org.sublabel:Your structure`,
  },
  select_plan: {
    icon: 'pi-star',
    label: $localize`:@@onboarding.step.plan.label:Choose a plan`,
    sublabel: $localize`:@@onboarding.step.plan.sublabel:Your subscription`,
  },
  invite_members: {
    icon: 'pi-users',
    label: $localize`:@@onboarding.step.members.label:Team & technicians`,
    sublabel: $localize`:@@onboarding.step.members.sublabel:Your team`,
  },
  create_first_facility: {
    icon: 'pi-map-marker',
    label: $localize`:@@onboarding.step.facility.label:First facility`,
    sublabel: $localize`:@@onboarding.step.facility.sublabel:Establishment`,
  },
  create_first_equipment: {
    icon: 'pi-wrench',
    label: $localize`:@@onboarding.step.equipment.label:First equipment`,
    sublabel: $localize`:@@onboarding.step.equipment.sublabel:Fire equipment`,
  },
  run_first_inspection: {
    icon: 'pi-clipboard',
    label: $localize`:@@onboarding.step.inspection.label:First inspection`,
    sublabel: $localize`:@@onboarding.step.inspection.sublabel:First check`,
  },
};
