import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  untracked,
  computed,
  effect,
  inject,
  signal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import type { Observable } from 'rxjs';
import { catchError, forkJoin, map, of, tap } from 'rxjs';
import { FeedbackService } from '@core/feedback';
import {
  idleCallState,
  pendingCallState,
  successCallState,
  errorCallState,
  toStoreError,
  type CallState,
  type StoreError,
} from '@core/request-state';
import { resolveReturnUrl } from '@features/auth/utils';
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
import { HlmAlertImports } from '@shared/ui/alert';
import { HlmButton } from '@shared/ui/button';
import { HlmCollapsibleImports } from '@shared/ui/collapsible';
import { HlmProgressImports } from '@shared/ui/progress';
import { HlmSkeleton } from '@shared/ui/skeleton';
import { HlmSpinner } from '@shared/ui/spinner';

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
    ...HlmAlertImports,
    ...HlmCollapsibleImports,
    ...HlmProgressImports,
    HlmSkeleton,
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
  /** @description Releases in-flight setup work when the route closes. */
  private readonly destroyRef: DestroyRef = inject(DestroyRef);
  private readonly route: ActivatedRoute = inject(ActivatedRoute);

  /** @description The lifecycle phases are separate from resource creation and remain locally retryable. */
  protected readonly lifecycleError: Signal<StoreError | null> = computed(
    () =>
      this.store.startCallState().error ??
      this.store.skipStepCallState().error ??
      this.store.rollbackCallState().error,
  );
  protected readonly planCatalogCallState: WritableSignal<CallState<void>> =
    signal(idleCallState());
  protected readonly rolesCallState: WritableSignal<CallState<void>> = signal(idleCallState());
  protected readonly facilitiesCallState: WritableSignal<CallState<void>> = signal(idleCallState());
  protected readonly catalogError: Signal<StoreError | null> = computed(() => {
    switch (this.currentStep()?.key) {
      case 'select_plan':
        return this.planCatalogCallState().error;
      case 'invite_members':
        return this.rolesCallState().error;
      case 'create_first_equipment':
        return this.facilitiesCallState().error;
      default:
        return null;
    }
  });
  protected readonly completedInvitations: WritableSignal<readonly SetupInviteMemberInput[]> =
    signal([]);
  protected readonly completedFacilityDrafts: WritableSignal<readonly SetupCreateFacilityInput[]> =
    signal([]);
  protected readonly failedInvitations: WritableSignal<readonly string[]> = signal([]);
  protected readonly failedFacilities: WritableSignal<readonly string[]> = signal([]);
  private readonly createdSteps: Set<OnboardingStepKey> = new Set();
  protected readonly stepNumberLabel: Signal<string> = computed(() => {
    const position = Math.max(
      1,
      this.store.steps().findIndex((step) => step.key === this.store.nextStep()) + 1,
    );
    const total = this.store.progress().total;
    return $localize`:@@onboarding.wizard.stepPosition:Step ${position}:position: of ${total}:total:`;
  });
  protected readonly progressValue: Signal<number> = computed(() => {
    const { done, total } = this.store.progress();
    return total > 0 ? (done / total) * 100 : 0;
  });
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
   * @description The facilities the `create_first_facility` step created, kept so `create_first_equipment` can attach the equipment to one of them. Reloaded from setup when the wizard resumes at equipment.
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
  protected readonly catalogPending: Signal<boolean> = computed(() =>
    [this.planCatalogCallState(), this.rolesCallState(), this.facilitiesCallState()].some(
      (state) => state.status === 'pending',
    ),
  );

  /**
   * Property actionState
   * @readonly
   * @description The resource-creation phase's explicit request state.
   * @access protected
   * @since 1.0.0
   * @type {WritableSignal<CallState<void>>}
   */
  protected readonly actionState: WritableSignal<CallState<void>> = signal(idleCallState());

  /**
   * Property stepPending
   * @readonly
   * @description Combines the local creation phase with the store's own confirm/skip call states, driving every step form's `pending` input.
   * @access protected
   * @since 1.0.0
   * @type {Signal<boolean>}
   */
  protected readonly stepPending: Signal<boolean> = computed(
    () =>
      this.actionState().status === 'pending' ||
      this.store.isExecutingStep() ||
      this.store.isSkippingStep() ||
      this.store.isRollingBack(),
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
        const organizationId = this.store.targetOrganizationId();
        const destination = organizationId
          ? `/organizations/${organizationId}`
          : resolveReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl'), '/');
        void this.router.navigateByUrl(destination);
      }
    });

    effect(() => {
      const step = this.currentStep();
      if (step === null) return;
      if (step.key === 'select_plan' && this.planCatalogCallState().status === 'idle')
        untracked(() => this.loadPlanCatalog());
      if (step.key === 'invite_members' && this.rolesCallState().status === 'idle')
        untracked(() => this.loadRoles());
      if (step.key === 'create_first_equipment' && this.facilitiesCallState().status === 'idle')
        untracked(() => this.loadFacilities());
    });
    effect(() => {
      if (this.store.rollbackCallState().status !== 'success') return;
      const step = this.currentStep();
      if (step) this.createdSteps.delete(step.key);
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
    this.confirmStep('create_organization', () =>
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

    if (this.stepPending()) return;
    const remaining = invitations.filter(
      (input) => !this.completedInvitations().some((done) => done.email === input.email),
    );
    this.failedInvitations.set([]);
    const requests = remaining.map((input) =>
      this.organizationSetupService.inviteMembers(organizationId, [input]).pipe(
        tap(() => this.completedInvitations.update((done) => [...done, input])),
        map(() => null),
        catchError((error: unknown) => {
          this.failedInvitations.update((failed) => [...failed, input.email]);
          return of(toStoreError(error));
        }),
      ),
    );
    this.confirmBatch('invite_members', requests);
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

    if (this.stepPending()) return;
    const remaining = facilities.filter((input) => !this.completedFacilityDrafts().includes(input));
    this.failedFacilities.set([]);
    const requests = remaining.map((input) =>
      this.organizationSetupService.createFacilities(organizationId, [input]).pipe(
        tap((created) => {
          this.completedFacilityDrafts.update((done) => [...done, input]);
          this.createdFacilities.update((done) => [...done, ...created]);
        }),
        map(() => null),
        catchError((error: unknown) => {
          this.failedFacilities.update((failed) => [...failed, input.name]);
          return of(toStoreError(error));
        }),
      ),
    );
    this.confirmBatch('create_first_facility', requests);
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

    this.confirmStep('create_first_equipment', () =>
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
    if (this.stepPending()) return;
    if (!selection.requiresPayment) {
      this.store.executeStep({ stepKey: 'select_plan' });
      return;
    }

    const organizationId: string | null = this.store.targetOrganizationId();
    if (organizationId === null) return;

    this.actionState.set(pendingCallState());

    this.billingService
      .createCheckoutSession(organizationId, {
        planKey: selection.planKey,
        interval: selection.interval,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (session) => {
          this.actionState.set(successCallState(undefined));
          redirectToStripe(this.document, session.url);
        },
        error: (error: unknown) => {
          this.actionState.set(errorCallState(toStoreError(error)));
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
    if (step === null || !this.canSkip() || this.stepPending()) return;

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
    if (!this.store.canRollback() || this.stepPending()) return;
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
   * @param {() => Observable<TResult>} resourceCreation - The setup-boundary call that creates the underlying resource.
   * @param {(result: TResult) => void} [onCreated] - Invoked with the creation result before the step is confirmed.
   *
   * @returns {void}
   */
  private confirmStep<TResult>(
    stepKey: OnboardingStepKey,
    resourceCreation: () => Observable<TResult>,
    onCreated?: (result: TResult) => void,
  ): void {
    if (this.stepPending()) return;
    if (this.createdSteps.has(stepKey)) {
      this.store.executeStep({ stepKey });
      return;
    }
    this.actionState.set(pendingCallState());

    resourceCreation()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result: TResult) => {
          this.actionState.set(successCallState(undefined));
          this.createdSteps.add(stepKey);
          onCreated?.(result);
          this.store.executeStep({ stepKey });
        },
        error: (error: unknown) => {
          this.actionState.set(errorCallState(toStoreError(error)));
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
    this.planCatalogCallState.set(pendingCallState());
    forkJoin({ plans: this.planService.listAvailable(), pricing: this.billingService.getPricing() })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ plans, pricing }) => {
          this.plans.set(plans.member);
          this.pricing.set(pricing.member);
          this.planCatalogCallState.set(successCallState(undefined));
        },
        error: (error: unknown) =>
          this.planCatalogCallState.set(errorCallState(toStoreError(error))),
      });
  }

  /** @description Loads roles once; an empty catalog is a successful response. */
  private loadRoles(): void {
    const organizationId = this.store.targetOrganizationId();
    if (!organizationId) return;
    this.rolesCallState.set(pendingCallState());
    this.organizationSetupService
      .listRoles(organizationId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (roles) => {
          this.roles.set(roles);
          this.rolesCallState.set(successCallState(undefined));
        },
        error: (error: unknown) => this.rolesCallState.set(errorCallState(toStoreError(error))),
      });
  }

  /** @description Restores persisted sites when resuming directly at equipment. */
  private loadFacilities(): void {
    const organizationId = this.store.targetOrganizationId();
    if (!organizationId) return;
    this.facilitiesCallState.set(pendingCallState());
    this.organizationSetupService
      .listFacilities(organizationId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (facilities) => {
          this.createdFacilities.set(facilities);
          this.facilitiesCallState.set(successCallState(undefined));
        },
        error: (error: unknown) =>
          this.facilitiesCallState.set(errorCallState(toStoreError(error))),
      });
  }

  /** @description Explicit retries never depend on a catalog's item count. */
  protected retryCatalog(): void {
    if (this.catalogPending()) return;
    switch (this.currentStep()?.key) {
      case 'select_plan':
        this.loadPlanCatalog();
        break;
      case 'invite_members':
        this.loadRoles();
        break;
      case 'create_first_equipment':
        this.loadFacilities();
        break;
    }
  }

  /** @description Retries the failed lifecycle command without creating a resource again. */
  protected retryLifecycle(): void {
    if (this.store.isBusy()) return;
    if (this.store.startCallState().error) void this.store.initialize();
    else if (this.store.skipStepCallState().error) this.skipCurrentStep();
    else if (this.store.rollbackCallState().error) this.rollbackStep();
    else this.store.load();
  }

  /** @description Awaits every row and confirms only when the full batch succeeded; successful rows stay recorded for retry. */
  private confirmBatch(
    stepKey: OnboardingStepKey,
    requests: readonly Observable<StoreError | null>[],
  ): void {
    this.actionState.set(pendingCallState());
    (requests.length ? forkJoin(requests) : of([]))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((errors) => {
        const error = errors.find((item) => item !== null);
        if (error) {
          this.actionState.set(errorCallState(error));
          return;
        }
        this.actionState.set(successCallState(undefined));
        this.createdSteps.add(stepKey);
        this.store.executeStep({ stepKey });
      });
  }
}
