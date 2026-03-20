import {
  Component,
  ChangeDetectionStrategy,
  inject,
  type Signal,
  type Type,
} from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { MessageModule } from 'primeng/message';
import type { MessagePassThroughOptions } from 'primeng/types/message';
import { ButtonModule, type ButtonPassThroughOptions } from 'primeng/button';
import { StepperModule } from 'primeng/stepper';
import type { StepPanelPassThroughOptions, StepPanelsPassThroughOptions, StepperPassThroughOptions } from 'primeng/types/stepper';
import { OnboardingStore } from '@core/stores/onboarding';
import type { OnboardingStepKey, OnboardingStepOutput, OnboardingStepStatus } from '@core/models/onboarding';
import { OnboardingStepBase } from './steps/onboarding-step.base';
import { CreateOrganizationStep } from './steps/create-organization-step';
import { InviteMembersStep } from './steps/invite-members-step';
import { CreateFacilityStep } from './steps/create-facility-step';
import { CreateEquipmentStep } from './steps/create-equipment-step';
import { RunInspectionStep } from './steps/run-inspection-step';

/**
 * Interface OnboardingStepMeta
 *
 * @description
 * Sidebar display metadata for a single onboarding step:
 * the short label shown next to the indicator circle and the
 * sub-description rendered below it.
 */
interface OnboardingStepMeta {
  readonly label: string;
  readonly description: string;
}

/**
 * Component OnboardingStepper
 * @class OnboardingStepper
 *
 * @description
 * Container component that orchestrates the onboarding wizard steps
 * using PrimeNG Stepper. Delegates each step to a dedicated step
 * component.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-onboarding-stepper',
  imports: [
    NgComponentOutlet,
    MessageModule,
    ButtonModule,
    StepperModule,
  ],
  templateUrl: './onboarding-stepper.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardingStepper {
  //#region Properties
  /**
   * Property onboardingStore
   * @readonly
   *
   * @description
   * Injected onboarding store to manage the onboarding
   * state and logic.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {OnboardingStore}
   */
  protected readonly onboardingStore: OnboardingStore =
    inject<OnboardingStore>(OnboardingStore);

  /**
   * Property activeStep
   * @readonly
   *
   * @description
   * Signal of the index of the currently active onboarding
   * step, used to control
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<number>}
   */
  protected readonly activeStep: Signal<number> = this.onboardingStore.activeStepIndex;

  /**
   * Property canRollback
   * @readonly
   *
   * @description
   * Signal indicating whether the user can rollback to the previous step, used to
   * conditionally display the rollback button and allow
   * going back in the onboarding flow.
   *
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canRollback: Signal<boolean> = this.onboardingStore.canRollback;

  /**
   * Property rollbackButtonPt
   * @readonly
   *
   * @description
   * PrimeNG passthrough configuration for the rollback button, used to
   * style the button consistently with the design system and ensure proper
   * alignment and spacing in the step header.
   *
   * @access protected
   * @since 1.0.0
   */
  protected readonly rollbackButtonPt: ButtonPassThroughOptions = {
    root: { class: 'justify-start' },
  };

  /**
   * Property stepperPt
   * @readonly
   *
   * @description
   * PrimeNG passthrough configuration for the stepper root.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {StepperPassThroughOptions}
   */
  protected readonly stepperPt: StepperPassThroughOptions = {
    root: { class: 'block' },
  };

  /**
   * Property stepPanelsPt
   * @readonly
   *
   * @description
   * PrimeNG passthrough configuration for
   * the step panels container.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {StepPanelsPassThroughOptions}
   */
  protected readonly stepPanelsPt: StepPanelsPassThroughOptions = {
    root: { class: 'block p-0 mt-0' },
  };

  /**
   * Property stepPanelPt
   * @readonly
   *
   * @description
   * PrimeNG passthrough configuration for each step panel.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {StepPanelPassThroughOptions}
   */
  protected readonly stepPanelPt: StepPanelPassThroughOptions = {
    root: { class: 'block p-0 m-0' },
  };

  /**
   * Property messagePt
   * @readonly
   *
   * @description
   * PrimeNG passthrough configuration for the blocking error message.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {MessagePassThroughOptions}
   */
  protected readonly messagePt: MessagePassThroughOptions = {
    root: { class: 'mb-5 w-full' },
  };

  /**
   * Property stepMeta
   * @readonly
   *
   * @description
   * Exhaustive map from every {@link OnboardingStepKey} to the sidebar
   * label and sub-description displayed in the step navigation.
   * Using a typed Record guarantees a compile-time error if a step key
   * is added to the domain model without a corresponding entry here.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Record<OnboardingStepKey, OnboardingStepMeta>}
   */
  protected readonly stepMeta: Record<OnboardingStepKey, OnboardingStepMeta> = {
    create_organization: {
      label: 'Create organization',
      description: 'Legal information and company identity'
    },
    invite_members: {
      label: 'Team & technicians',
      description: 'Invitations, access management and collaboration'
    },
    create_first_facility: {
      label: 'First facility',
      description: 'Site, building or area to monitor'
    },
    create_first_equipment: {
      label: 'First equipment',
      description: 'Extinguisher, detector or other fire safety equipment'
    },
    run_first_inspection: {
      label: 'First inspection',
      description: 'Initial equipment inspection'
    },
  };

  /**
   * Property stepComponents
   * @readonly
   *
   * @description
   * Exhaustive map from every {@link OnboardingStepKey} to the Angular
   * component class that renders the corresponding wizard panel.
   * Consumed by {@link NgComponentOutlet} in the template, which
   * eliminates the need for a `@switch` block.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Record<OnboardingStepKey, Type<OnboardingStepBase>>}
   */
  protected readonly stepComponents: Record<OnboardingStepKey, Type<OnboardingStepBase>> = {
    create_organization:    CreateOrganizationStep,
    invite_members:         InviteMembersStep,
    create_first_facility:  CreateFacilityStep,
    create_first_equipment: CreateEquipmentStep,
    run_first_inspection:   RunInspectionStep,
  };

  /**
   * Property statusIndicatorClass
   * @readonly
   *
   * @description
   * Exhaustive map from every {@link OnboardingStepStatus} to the Tailwind
   * CSS classes applied to the step indicator circle in the sidebar.
   * Covering all statuses avoids a runtime fallback and ensures a
   * compile-time error when a new status value is introduced.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Record<OnboardingStepStatus, string>}
   */
  protected readonly statusIndicatorClass: Record<OnboardingStepStatus, string> = {
    pending:   'ring-1 ring-surface-300 bg-transparent text-surface-400 dark:ring-surface-700 dark:text-surface-500',
    completed: 'bg-green-500 text-white',
    skipped:   'bg-surface-300 text-surface-700 dark:bg-surface-700 dark:text-surface-300',
    blocked:   'bg-red-500 text-white',
  };
  //#endregion

  //#region Methods
  /**
   * Method handleRollback
   *
   * @description
   * Delegates the rollback action to the onboarding store, moving the
   * wizard back to the previously completed step.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected handleRollback(): void {
    this.onboardingStore.rollback();
  }

  /**
   * Method stepLabel
   *
   * @description
   * Returns the sidebar label for a given step, sourced from the
   * exhaustive {@link stepMeta} record.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {OnboardingStepOutput} step - The step whose label to retrieve.
   * @returns {string} The human-readable step label.
   */
  protected stepLabel(step: OnboardingStepOutput): string {
    return this.stepMeta[step.key].label;
  }

  /**
   * Method stepDescription
   *
   * @description
   * Returns the sidebar sub-description for a given step, sourced from
   * the exhaustive {@link stepMeta} record.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {OnboardingStepOutput} step - The step whose description to retrieve.
   * @returns {string} The human-readable step description.
   */
  protected stepDescription(step: OnboardingStepOutput): string {
    return this.stepMeta[step.key].description;
  }

  /**
   * Method stepIndicatorClass
   *
   * @description
   * Returns the Tailwind CSS classes for the step indicator circle.
   * The active step always gets a distinct "current" style; all other
   * steps are styled according to their {@link OnboardingStepStatus}
   * via the exhaustive {@link statusIndicatorClass} record.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {number} index - Zero-based position of the step in the list.
   * @param {OnboardingStepOutput} step - The step to style.
   * @returns {string} Space-separated Tailwind CSS class string.
   */
  protected stepIndicatorClass(index: number, step: OnboardingStepOutput): string {
    if (index === this.activeStep()) {
      return 'bg-surface-900 text-surface-0 dark:bg-surface-100 dark:text-surface-900';
    }
    return this.statusIndicatorClass[step.status];
  }

  /**
   * Method stepConnectorClass
   *
   * @description
   * Returns the CSS class for the vertical connector line between two
   * step indicator circles. Steps before the active one use a filled
   * colour; upcoming steps use a muted tone.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {number} index - Zero-based position of the upper step.
   * @returns {string} Space-separated Tailwind CSS class string.
   */
  protected stepConnectorClass(index: number): string {
    return index < this.activeStep()
      ? 'bg-surface-400 dark:bg-surface-500'
      : 'bg-surface-200 dark:bg-surface-800';
  }

  /**
   * Method stepLabelClass
   *
   * @description
   * Returns the CSS class for the step label text. Three visual states
   * are distinguished: active (bold/dark), past (dimmed), and future
   * (muted).
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {number} index - Zero-based position of the step.
   * @returns {string} Space-separated Tailwind CSS class string.
   */
  protected stepLabelClass(index: number): string {
    if (index === this.activeStep()) return 'text-surface-900 dark:text-surface-0';
    if (index < this.activeStep())  return 'text-surface-600 dark:text-surface-300';
    return 'text-surface-400 dark:text-surface-500';
  }

  /**
   * Method stepDescriptionClass
   *
   * @description
   * Returns the CSS class for the step description text. The active step
   * uses a slightly more prominent colour; all other steps are muted.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {number} index - Zero-based position of the step.
   * @returns {string} Space-separated Tailwind CSS class string.
   */
  protected stepDescriptionClass(index: number): string {
    return index === this.activeStep()
      ? 'text-surface-500 dark:text-surface-400'
      : 'text-surface-400 dark:text-surface-600';
  }

  /**
   * Method getStepComponent
   *
   * @description
   * Resolves the Angular component class for a given step key from the
   * exhaustive {@link stepComponents} record. Used by `NgComponentOutlet`
   * in the template to dynamically render the active step panel without
   * a `@switch` block.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {OnboardingStepKey} key - The step key to resolve.
   * @returns {Type<OnboardingStepBase>} The component class to render.
   */
  protected getStepComponent(key: OnboardingStepKey): Type<OnboardingStepBase> {
    return this.stepComponents[key];
  }
  //#endregion
}
