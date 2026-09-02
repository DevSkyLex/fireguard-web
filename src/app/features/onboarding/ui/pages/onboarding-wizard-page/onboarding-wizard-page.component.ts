import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { Router } from '@angular/router';
import type { Observable } from 'rxjs';
import { forkJoin } from 'rxjs';
import { FeedbackService } from '@core/feedback';
import { ONBOARDING_STEP_PRESENTATION } from '@features/onboarding/constants';
import type { OnboardingStepKey, OnboardingStepOutput } from '@features/onboarding/models';
import { OnboardingStore } from '@features/onboarding/state';
import { OnboardingStepRail } from '@features/onboarding/ui/components';
import {
  OnboardingEquipmentForm,
  OnboardingFacilitiesForm,
  OnboardingMembersForm,
  OnboardingOrganizationForm,
  OnboardingPlanForm,
  type OnboardingPlanSelection,
} from '@features/onboarding/ui/forms';
import { BillingService, PlanService } from '@features/organization/data-access';
import type { PlanOutput, PlanPricingOutput } from '@features/organization/models';
import {
  OrganizationSetupService,
  type SetupCreateEquipmentInput,
  type SetupCreateFacilityInput,
  type SetupCreateOrganizationInput,
  type SetupFacilitySummary,
  type SetupInviteMemberInput,
  type SetupOrganizationRole,
} from '@features/organization/setup';
import { PageHeading } from '@shared/page-heading';
import { HlmButton } from '@shared/ui/button';
import { HlmSpinner } from '@shared/ui/spinner';
import type { OnboardingWizardActionState } from './models';

/**
 * Function redirectToStripe
 *
 * @description
 * Redirects the browser to a Stripe-hosted URL. SSR-safe: `defaultView` is
 * null on the server, so the navigation only happens in the browser.
 * Exported so it can be verified against a plain document double, without
 * touching the real, largely non-configurable `window.location` a rendered
 * component test runs against.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {Document} documentRef - The DOM document.
 * @param {string} url - The Stripe-hosted URL to navigate to.
 *
 * @returns {void}
 */
export function redirectToStripe(documentRef: Document, url: string): void {
  documentRef.defaultView?.location.assign(url);
}

/**
 * Component OnboardingWizardPage
 * @class OnboardingWizardPage
 *
 * @description
 * The mandatory activation wizard's route entry, `/onboarding`. Orchestrates
 * the whole flow: bootstraps the onboarding record, renders the current
 * step's rail and form, lazily loads each step's own catalog data (plans,
 * pricing, roles), creates the underlying resource through
 * `@features/organization/setup`, and confirms every step through
 * `OnboardingStore` — the step bodies themselves never call a service
 * (`ARCHITECTURE.md` §10.1, §10.3). Under the heading it names the step that
 * comes next, so the operator always knows where the flow leads; the skip
 * affordance lives in each form's footer and is relayed here. Redirects to
 * `/` the moment the record reports `completed`, announcing it with a toast.
 *
 * @version 1.1.0
 *
 * @example
 * ```html
 * <app-onboarding-wizard-page />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-onboarding-wizard-page',
  imports: [
    HlmButton,
    HlmSpinner,
    OnboardingStepRail,
    OnboardingEquipmentForm,
    OnboardingFacilitiesForm,
    OnboardingMembersForm,
    OnboardingOrganizationForm,
    OnboardingPlanForm,
    PageHeading,
  ],
  templateUrl: './onboarding-wizard-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardingWizardPage {
  //#region Properties
  /**
   * Property store
   * @readonly
   * @description Root-provided onboarding record and lifecycle actions.
   * @access protected
   * @since 1.0.0
   * @type {OnboardingStore}
   */
  protected readonly store: OnboardingStore = inject<OnboardingStore>(OnboardingStore);

  /**
   * Property organizationSetupService
   * @readonly
   * @description The one organization surface onboarding creates resources through.
   * @access private
   * @since 1.0.0
   * @type {OrganizationSetupService}
   */
  private readonly organizationSetupService: OrganizationSetupService =
    inject<OrganizationSetupService>(OrganizationSetupService);

  /**
   * Property planService
   * @readonly
   * @description Root-provided plan catalog, consumed directly per `FEATURE.md` "Cross-Feature Dependencies".
   * @access private
   * @since 1.0.0
   * @type {PlanService}
   */
  private readonly planService: PlanService = inject<PlanService>(PlanService);

  /**
   * Property billingService
   * @readonly
   * @description Root-provided billing service, used for pricing and to start Checkout for a paid plan.
   * @access private
   * @since 1.0.0
   * @type {BillingService}
   */
  private readonly billingService: BillingService = inject<BillingService>(BillingService);

  /**
   * Property router
   * @readonly
   * @description Used to leave the wizard once onboarding is complete.
   * @access private
   * @since 1.0.0
   * @type {Router}
   */
  private readonly router: Router = inject<Router>(Router);

  /**
   * Property feedback
   * @readonly
   * @description Announces the completed activation before the dashboard takes over.
   * @access private
   * @since 1.1.0
   * @type {FeedbackService}
   */
  private readonly feedback: FeedbackService = inject<FeedbackService>(FeedbackService);

  /**
   * Property document
   * @readonly
   * @description Used for the SSR-safe Stripe Checkout redirect.
   * @access private
   * @since 1.0.0
   * @type {Document}
   */
  private readonly document: Document = inject<Document>(DOCUMENT);

  /**
   * Property currentStep
   * @readonly
   * @description The step the operator should act on next, or `null` once every step is resolved.
   * @access protected
   * @since 1.0.0
   * @type {Signal<OnboardingStepOutput | null>}
   */
  protected readonly currentStep: Signal<OnboardingStepOutput | null> = computed(() => {
    const nextStep: OnboardingStepKey | null = this.store.nextStep();
    if (nextStep === null) return null;

    return this.store.steps().find((step) => step.key === nextStep) ?? null;
  });

  /**
   * Property stepPresentation
   * @readonly
   * @description The active step's title and description, or `null` when there is no active step.
   * @access protected
   * @since 1.0.0
   * @type {Signal<(typeof ONBOARDING_STEP_PRESENTATION)[OnboardingStepKey] | null>}
   */
  protected readonly stepPresentation: Signal<
    (typeof ONBOARDING_STEP_PRESENTATION)[OnboardingStepKey] | null
  > = computed(() => {
    const step: OnboardingStepOutput | null = this.currentStep();

    return step === null ? null : ONBOARDING_STEP_PRESENTATION[step.key];
  });

  /**
   * Property canSkip
   * @readonly
   * @description Whether the active step may be skipped right now — the backend both declares it skippable and currently offers the skip.
   * @access protected
   * @since 1.1.0
   * @type {Signal<boolean>}
   */
  protected readonly canSkip: Signal<boolean> = computed<boolean>(() => {
    const step: OnboardingStepOutput | null = this.currentStep();

    return step !== null && step.skippable && step.skipAvailable;
  });

  /**
   * Property nextStepHint
   * @readonly
   * @description Names the step that follows the active one — "Next: Choose a plan" — or says this is the last step, so the flow's shape is visible from inside any step. A step the backend reports `blocked` only because this one is not done yet still counts as what comes next.
   * @access protected
   * @since 1.1.0
   * @type {Signal<string>}
   */
  protected readonly nextStepHint: Signal<string> = computed<string>(() => {
    const steps: readonly OnboardingStepOutput[] = this.store.steps();
    const current: OnboardingStepOutput | null = this.currentStep();
    const index: number = current === null ? -1 : steps.findIndex((s) => s.key === current.key);
    const following: OnboardingStepOutput | undefined = steps
      .slice(index + 1)
      .find((s) => s.status !== 'completed' && s.status !== 'skipped');

    if (following === undefined) {
      return $localize`:@@onboarding.wizard.lastStep:Last step — your workspace opens right after.`;
    }

    const label: string = ONBOARDING_STEP_PRESENTATION[following.key].label;

    return $localize`:@@onboarding.wizard.nextStep:Next: ${label}:label:`;
  });

  /**
   * Property plans
   * @readonly
   * @description The `select_plan` step's catalog, loaded lazily once that step becomes active.
   * @access protected
   * @since 1.0.0
   * @type {WritableSignal<readonly PlanOutput[]>}
   */
  protected readonly plans: WritableSignal<readonly PlanOutput[]> = signal<readonly PlanOutput[]>(
    [],
  );

  /**
   * Property pricing
   * @readonly
   * @description The `select_plan` step's display pricing, loaded lazily alongside {@link plans}.
   * @access protected
   * @since 1.0.0
   * @type {WritableSignal<readonly PlanPricingOutput[]>}
   */
  protected readonly pricing: WritableSignal<readonly PlanPricingOutput[]> = signal<
    readonly PlanPricingOutput[]
  >([]);

  /**
   * Property roles
   * @readonly
   * @description The `invite_members` step's assignable roles, loaded lazily once that step becomes active.
   * @access protected
   * @since 1.0.0
   * @type {WritableSignal<readonly SetupOrganizationRole[]>}
   */
  protected readonly roles: WritableSignal<readonly SetupOrganizationRole[]> = signal<
    readonly SetupOrganizationRole[]
  >([]);

  /**
   * Property createdFacilities
   * @readonly
   * @description The facilities the `create_first_facility` step created, kept so `create_first_equipment` can attach the equipment to one of them. Empty when the facility step was skipped or the wizard resumed past it.
   * @access protected
   * @since 1.0.0
   * @type {WritableSignal<readonly SetupFacilitySummary[]>}
   */
  protected readonly createdFacilities: WritableSignal<readonly SetupFacilitySummary[]> = signal<
    readonly SetupFacilitySummary[]
  >([]);

  /**
   * Property catalogPending
   * @readonly
   * @description Whether a step's own catalog (plans, pricing, or roles) is loading.
   * @access protected
   * @since 1.0.0
   * @type {WritableSignal<boolean>}
   */
  protected readonly catalogPending: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property actionState
   * @readonly
   * @description The resource-creation phase's own pending/error pair (see {@link OnboardingWizardActionState}).
   * @access protected
   * @since 1.0.0
   * @type {WritableSignal<OnboardingWizardActionState>}
   */
  protected readonly actionState: WritableSignal<OnboardingWizardActionState> =
    signal<OnboardingWizardActionState>({ pending: false, error: null });

  /**
   * Property stepPending
   * @readonly
   * @description Combines the local creation phase with the store's own confirm/skip call states, driving every step form's `pending` input.
   * @access protected
   * @since 1.0.0
   * @type {Signal<boolean>}
   */
  protected readonly stepPending: Signal<boolean> = computed(
    () => this.actionState().pending || this.store.isExecutingStep() || this.store.isSkippingStep(),
  );

  /**
   * Property stepError
   * @readonly
   * @description Combines the local creation error with the store's own confirm error, driving every step form's `serverError` input.
   * @access protected
   * @since 1.0.0
   * @type {Signal<unknown>}
   */
  protected readonly stepError: Signal<unknown> = computed(
    () => this.actionState().error ?? this.store.executeStepError(),
  );
  //#endregion

  //#region Lifecycle
  constructor() {
    void this.store.initialize();

    effect(() => {
      if (this.store.isCompleted()) {
        this.feedback.success(
          $localize`:@@onboarding.wizard.completed:Your organization is ready.`,
        );
        void this.router.navigateByUrl('/');
      }
    });

    effect(() => {
      const step: OnboardingStepOutput | null = this.currentStep();
      if (step === null || this.catalogPending()) return;

      if (step.key === 'select_plan' && this.plans().length === 0) {
        this.loadPlanCatalog();
      }

      if (step.key === 'invite_members' && this.roles().length === 0) {
        this.loadRoles();
      }
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method submitOrganization
   * @description Creates the organization, then confirms `create_organization`.
   * @access protected
   * @since 1.0.0
   * @param {SetupCreateOrganizationInput} input - The organization draft.
   * @returns {void}
   */
  protected submitOrganization(input: SetupCreateOrganizationInput): void {
    this.confirmStep(
      'create_organization',
      this.organizationSetupService.createOrganization(input),
    );
  }

  /**
   * Method submitMembers
   * @description Sends the staged invitations, then confirms `invite_members`.
   * @access protected
   * @since 1.0.0
   * @param {readonly SetupInviteMemberInput[]} invitations - The staged batch, possibly empty.
   * @returns {void}
   */
  protected submitMembers(invitations: readonly SetupInviteMemberInput[]): void {
    const organizationId: string | null = this.store.targetOrganizationId();
    if (organizationId === null) return;

    this.confirmStep(
      'invite_members',
      this.organizationSetupService.inviteMembers(organizationId, invitations),
    );
  }

  /**
   * Method submitFacilities
   * @description Creates the staged facilities, memorizes them for the equipment step, then confirms `create_first_facility`.
   * @access protected
   * @since 1.0.0
   * @param {readonly SetupCreateFacilityInput[]} facilities - The staged batch.
   * @returns {void}
   */
  protected submitFacilities(facilities: readonly SetupCreateFacilityInput[]): void {
    const organizationId: string | null = this.store.targetOrganizationId();
    if (organizationId === null) return;

    this.confirmStep(
      'create_first_facility',
      this.organizationSetupService.createFacilities(organizationId, facilities),
      (created) => this.createdFacilities.set(created),
    );
  }

  /**
   * Method submitEquipment
   * @description Registers the equipment, then confirms `create_first_equipment`.
   * @access protected
   * @since 1.0.0
   * @param {SetupCreateEquipmentInput} input - The equipment draft.
   * @returns {void}
   */
  protected submitEquipment(input: SetupCreateEquipmentInput): void {
    const organizationId: string | null = this.store.targetOrganizationId();
    if (organizationId === null) return;

    this.confirmStep(
      'create_first_equipment',
      this.organizationSetupService.createEquipment(organizationId, input),
    );
  }

  /**
   * Method submitPlan
   *
   * @description
   * A free plan confirms `select_plan` directly. A paid plan starts a Stripe
   * Checkout session and leaves the SPA — the step is confirmed by the
   * backend once the webhook records the subscription, not by this call.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {OnboardingPlanSelection} selection - The chosen plan.
   *
   * @returns {void}
   */
  protected submitPlan(selection: OnboardingPlanSelection): void {
    if (!selection.requiresPayment) {
      this.store.executeStep({ stepKey: 'select_plan' });
      return;
    }

    const organizationId: string | null = this.store.targetOrganizationId();
    if (organizationId === null) return;

    this.actionState.set({ pending: true, error: null });

    this.billingService
      .createCheckoutSession(organizationId, {
        planKey: selection.planKey,
        interval: selection.interval,
      })
      .subscribe({
        next: (session) => {
          this.actionState.set({ pending: false, error: null });
          redirectToStripe(this.document, session.url);
        },
        error: (error: unknown) => {
          this.actionState.set({ pending: false, error });
        },
      });
  }

  /**
   * Method skipCurrentStep
   *
   * @description
   * Skips the active step through the store, when the backend marked it
   * skippable and currently available.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected skipCurrentStep(): void {
    const step: OnboardingStepOutput | null = this.currentStep();
    if (step === null) return;

    this.store.skipStep(step.key);
  }

  /**
   * Method rollbackStep
   *
   * @description
   * Rolls back the last completed step through the store, when
   * {@link OnboardingStore.canRollback} allows it.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected rollbackStep(): void {
    this.store.rollback();
  }
  //#endregion

  //#region Internals
  /**
   * Method confirmStep
   *
   * @description
   * The two-phase confirmation every resource-backed step shares: create the
   * resource through the setup boundary, then confirm the step through the
   * store. The store's own `executeStepCallState` takes over as the
   * authoritative pending/error source once the creation phase succeeds.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {OnboardingStepKey} stepKey - The step being confirmed.
   * @param {Observable<TResult>} resourceCreation - The setup-boundary call that creates the underlying resource.
   * @param {(result: TResult) => void} [onCreated] - Invoked with the creation result before the step is confirmed.
   *
   * @returns {void}
   */
  private confirmStep<TResult>(
    stepKey: OnboardingStepKey,
    resourceCreation: Observable<TResult>,
    onCreated?: (result: TResult) => void,
  ): void {
    this.actionState.set({ pending: true, error: null });

    resourceCreation.subscribe({
      next: (result: TResult) => {
        this.actionState.set({ pending: false, error: null });
        onCreated?.(result);
        this.store.executeStep({ stepKey });
      },
      error: (error: unknown) => {
        this.actionState.set({ pending: false, error });
      },
    });
  }

  /**
   * Method loadPlanCatalog
   * @description Loads the plan catalog and its display pricing together, once.
   * @access private
   * @since 1.0.0
   * @returns {void}
   */
  private loadPlanCatalog(): void {
    this.catalogPending.set(true);

    forkJoin({
      plans: this.planService.listAvailable(),
      pricing: this.billingService.getPricing(),
    }).subscribe({
      next: ({ plans, pricing }) => {
        this.plans.set(plans.member);
        this.pricing.set(pricing.member);
        this.catalogPending.set(false);
      },
      error: () => {
        this.catalogPending.set(false);
      },
    });
  }

  /**
   * Method loadRoles
   * @description Loads the target organization's assignable roles, once.
   * @access private
   * @since 1.0.0
   * @returns {void}
   */
  private loadRoles(): void {
    const organizationId: string | null = this.store.targetOrganizationId();
    if (organizationId === null) return;

    this.catalogPending.set(true);

    this.organizationSetupService.listRoles(organizationId).subscribe({
      next: (roles) => {
        this.roles.set(roles);
        this.catalogPending.set(false);
      },
      error: () => {
        this.catalogPending.set(false);
      },
    });
  }
  //#endregion
}
