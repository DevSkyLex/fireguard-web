import type { OnboardingStepKey, OnboardingStepPresentation } from '@features/onboarding/models';

/**
 * Constant ONBOARDING_STEP_PRESENTATION
 * @const ONBOARDING_STEP_PRESENTATION
 *
 * @description
 * Exhaustive, localized presentation metadata for every {@link OnboardingStepKey}:
 * a PrimeIcons name, a short title, a compact rail subtitle, and the longer
 * content-heading description. Shared by the wizard rail, the wizard content
 * heading, and the shell setup checklist so every surface renders identical step
 * copy. A typed `Record` fails the build if a step key is added to the domain
 * model without a presentation entry.
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
    description: $localize`:@@onboarding.org.subtitle:Set up the basic information for your fire safety company.`,
  },
  select_plan: {
    icon: 'pi-star',
    label: $localize`:@@onboarding.step.plan.label:Choose a plan`,
    sublabel: $localize`:@@onboarding.step.plan.sublabel:Your subscription`,
    description: $localize`:@@onboarding.plan.subtitle:Pick the plan that fits your team. You can change it any time — or stay on Free for now.`,
  },
  invite_members: {
    icon: 'pi-users',
    label: $localize`:@@onboarding.step.members.label:Team & technicians`,
    sublabel: $localize`:@@onboarding.step.members.sublabel:Your team`,
    description: $localize`:@@onboarding.members.subtitle:Invite your first team members to start collaborating.`,
  },
  create_first_facility: {
    icon: 'pi-map-marker',
    label: $localize`:@@onboarding.step.facility.label:First facility`,
    sublabel: $localize`:@@onboarding.step.facility.sublabel:Establishment`,
    description: $localize`:@@onboarding.facilities.subtitle:Add the locations to monitor. You can create up to 5 at once.`,
  },
  create_first_equipment: {
    icon: 'pi-wrench',
    label: $localize`:@@onboarding.step.equipment.label:First equipment`,
    sublabel: $localize`:@@onboarding.step.equipment.sublabel:Fire equipment`,
    description: $localize`:@@onboarding.equipment.subtitle:Register your first fire safety equipment (extinguisher, detector…).`,
  },
};
