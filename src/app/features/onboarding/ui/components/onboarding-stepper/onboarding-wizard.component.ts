import { NgComponentOutlet } from '@angular/common';
import {
  Component,
  ChangeDetectionStrategy,
  computed,
  inject,
  signal,
  type Signal,
  type Type,
  type WritableSignal,
} from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import type { MessagePassThroughOptions } from 'primeng/types/message';
import type { OnboardingStepKey, OnboardingStepOutput } from '@features/onboarding/models';
import { OnboardingStore } from '@features/onboarding/state';
import {
  CreateEquipmentStep,
  CreateFacilityStep,
  CreateOrganizationStep,
  InviteMembersStep,
  type OnboardingStepBase,
  RunInspectionStep,
  SelectPlanStep,
} from './components';

/**
 * Type WizardPhase
 *
 * @description
 * The high-level surface the wizard renders, derived from store state and the
 * local `started` flag: a loading skeleton, the welcome screen, the active-step
 * flow, or the completion screen.
 */
type WizardPhase = 'loading' | 'welcome' | 'steps' | 'completion';

/**
 * Component OnboardingWizard
 * @class OnboardingWizard
 *
 * @description
 * Single-column activation flow rendered as a native page inside the dashboard
 * shell. The shell supplies the page chrome (topbar, navigation, and the
 * route-driven page-header banner) and the persistent setup checklist; the
 * wizard owns only a centered work surface that renders one step at a time —
 * a slim "Step N of M" progress, the active step body (delegated to a dedicated
 * step component), and a back / finish-later / skip footer — bookended by a
 * welcome screen and a completion screen. Onboarding is non-blocking: a
 * low-emphasis "Finish later" action dismisses the flow and returns to the
 * dashboard from any phase, and every step can be skipped or resumed later.
 *
 * @version 3.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-onboarding-wizard',
  imports: [NgComponentOutlet, MessageModule, ButtonModule],
  templateUrl: './onboarding-wizard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardingWizard {
  //#region Properties
  /**
   * Property store
   * @readonly
   *
   * @description
   * Injected onboarding store driving the activation flow state.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {OnboardingStore}
   */
  protected readonly store: OnboardingStore = inject<OnboardingStore>(OnboardingStore);

  /**
   * Property router
   * @readonly
   *
   * @access private
   * @since 2.0.0
   *
   * @type {Router}
   */
  private readonly router: Router = inject<Router>(Router);

  /**
   * Property started
   * @readonly
   *
   * @description
   * Whether the user has dismissed the welcome screen and entered the step flow.
   * Returning users (who already completed at least one step) skip the welcome.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly started: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property stepComponents
   * @readonly
   *
   * @description
   * Exhaustive map from every {@link OnboardingStepKey} to the component class
   * rendering its body. A typed Record guarantees a compile-time error when a new
   * step key is added to the domain model without a renderer.
   *
   * @access private
   * @since 2.0.0
   *
   * @type {Record<OnboardingStepKey, Type<OnboardingStepBase>>}
   */
  private readonly stepComponents: Record<OnboardingStepKey, Type<OnboardingStepBase>> = {
    create_organization: CreateOrganizationStep,
    select_plan: SelectPlanStep,
    invite_members: InviteMembersStep,
    create_first_facility: CreateFacilityStep,
    create_first_equipment: CreateEquipmentStep,
    run_first_inspection: RunInspectionStep,
  };

  /**
   * Property messagePt
   * @readonly
   *
   * @description
   * PrimeNG passthrough for inline banners (blocked / step error).
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {MessagePassThroughOptions}
   */
  protected readonly messagePt: MessagePassThroughOptions = {
    root: { class: 'w-full' },
  };

  /**
   * Property phase
   * @readonly
   *
   * @description
   * Current wizard surface derived from store state and the local `started` flag.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<WizardPhase>}
   */
  protected readonly phase: Signal<WizardPhase> = computed<WizardPhase>(() => {
    if (this.store.isCompleted()) return 'completion';
    const hasData: boolean = this.store.onboarding() !== null && this.store.steps().length > 0;
    if (!hasData) return 'loading';
    if (!this.started() && this.store.progress().done === 0) return 'welcome';
    return 'steps';
  });

  /**
   * Property currentStep
   * @readonly
   *
   * @description
   * The step descriptor for the current pending step, or `null` when none.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<OnboardingStepOutput | null>}
   */
  protected readonly currentStep: Signal<OnboardingStepOutput | null> =
    computed<OnboardingStepOutput | null>(() => {
      const key: OnboardingStepKey | null = this.store.nextStep();
      if (!key) return null;
      return this.store.steps().find((s) => s.key === key) ?? null;
    });

  /**
   * Property segments
   * @readonly
   *
   * @description
   * Index array used to render the segmented progress rail (one segment/step).
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<readonly number[]>}
   */
  protected readonly segments: Signal<readonly number[]> = computed<readonly number[]>(() =>
    Array.from({ length: this.store.steps().length }, (_unused, i) => i),
  );
  //#endregion

  //#region Methods
  /**
   * Method startSetup
   *
   * @description
   * Leaves the welcome screen and enters the step flow.
   *
   * @access protected
   * @since 2.0.0
   *
   * @returns {void}
   */
  protected startSetup(): void {
    this.started.set(true);
  }

  /**
   * Method finishLater
   *
   * @description
   * Leaves the (non-blocking) activation flow and returns to the dashboard.
   * Surfaced persistently in the wizard chrome so the user is never cornered:
   * progression is preserved server-side and can be resumed from the shell
   * setup checklist. Available from every phase, including a blocked step.
   *
   * @access protected
   * @since 2.1.0
   *
   * @returns {void}
   */
  protected finishLater(): void {
    this.store.dismiss();
    this.router.navigate(['/']).catch(() => undefined);
  }

  /**
   * Method retryAfterBlock
   *
   * @description
   * Re-fetches the onboarding record after the flow has been blocked, so a
   * server-side block that has since cleared lets the user continue without a
   * full page reload. Pairs with the concrete blocked banner.
   *
   * @access protected
   * @since 2.1.0
   *
   * @returns {void}
   */
  protected retryAfterBlock(): void {
    this.store.load();
  }

  /**
   * Method goToDashboard
   *
   * @description
   * Navigates to the dashboard from the completion screen.
   *
   * @access protected
   * @since 2.0.0
   *
   * @returns {void}
   */
  protected goToDashboard(): void {
    this.router.navigate(['/']).catch(() => undefined);
  }

  /**
   * Method handleBack
   *
   * @description
   * Rolls back the last rollbackable step.
   *
   * @access protected
   * @since 2.0.0
   *
   * @returns {void}
   */
  protected handleBack(): void {
    this.store.rollback();
  }

  /**
   * Method handleSkip
   *
   * @description
   * Skips the current step when it is skippable, advancing the flow.
   *
   * @access protected
   * @since 2.0.0
   *
   * @returns {void}
   */
  protected handleSkip(): void {
    const key: OnboardingStepKey | null = this.store.nextStep();
    if (key) this.store.skipStep(key);
  }

  /**
   * Method dismissStepError
   *
   * @description
   * Clears the execute-step error so the inline banner disappears and the next
   * attempt starts fresh.
   *
   * @access protected
   * @since 2.0.0
   *
   * @returns {void}
   */
  protected dismissStepError(): void {
    this.store.resetExecuteStepOperation();
  }

  /**
   * Method getStepComponent
   *
   * @description
   * Resolves the component class rendering a given step key.
   *
   * @access protected
   * @since 2.0.0
   *
   * @param {OnboardingStepKey} key - The step key to resolve.
   * @returns {Type<OnboardingStepBase>} The component class to render.
   */
  protected getStepComponent(key: OnboardingStepKey): Type<OnboardingStepBase> {
    return this.stepComponents[key];
  }
  //#endregion
}
