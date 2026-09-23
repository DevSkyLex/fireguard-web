import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  OnInit,
  afterNextRender,
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
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronDown } from '@ng-icons/lucide';
import { Events } from '@ngrx/signals/events';
import { forkJoin } from 'rxjs';
import { FeedbackService } from '@core/feedback';
import {
  idleCallState,
  pendingCallState,
  successCallState,
  errorCallState,
  toStoreError,
  toStoreFailureEventPayload,
  type CallState,
  type StoreError,
} from '@core/request-state';
import { resolveReturnUrl } from '@features/auth/utils';
import { ONBOARDING_STEP_PRESENTATION } from '@features/onboarding/constants';
import type {
  OnboardingOutput,
  OnboardingStepKey,
  OnboardingStepOutput,
  OnboardingSetupStep,
} from '@features/onboarding/models';
import {
  OnboardingStore,
  FacilityAddressSearchStore,
  OnboardingSetupStore,
  onboardingSetupEvents,
} from '@features/onboarding/state';
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
 * The organization creation wizard's route entry, `/onboarding/create`. Orchestrates
 * the whole flow: bootstraps the onboarding record, renders the current
 * step's compact collapsible progress above the form, lazily loads each step's own catalog data (plans,
 * pricing, roles), creates the underlying resource through
 * `@features/organization/setup`, and confirms every step through
 * `OnboardingStore` — the step bodies themselves never call a service
 * (`ARCHITECTURE.md` §10.1, §10.3). Below the form it names the step that
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
    NgIcon,
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
  providers: [
    provideIcons({ lucideChevronDown }),
    FacilityAddressSearchStore,
    OnboardingSetupStore,
  ],
  templateUrl: './onboarding-wizard-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardingWizardPage implements OnInit {
  /**
   * Property addressSearch
   * @readonly
   * @description Page-scoped suggestions; the form only consumes state and emits query changes.
   * @access protected
   * @since 1.0.0
   * @type {InstanceType<typeof FacilityAddressSearchStore>}
   */
  protected readonly addressSearch: InstanceType<typeof FacilityAddressSearchStore> = inject(
    FacilityAddressSearchStore,
  );

  /**
   * Method searchFacilityAddress
   * @method searchFacilityAddress
   * @description Queries suggestions only for the current creator organization; clearing cancels obsolete work.
   * @access protected
   * @since 1.0.0
   * @param {string} query - Typed address query.
   * @returns {void}
   */
  protected searchFacilityAddress(query: string): void {
    const organizationId: string | null = this.store.targetOrganizationId();
    if (!organizationId || query.trim().length < 3) {
      this.addressSearch.clear();
      return;
    }
    this.addressSearch.search({ organizationId, query });
  }

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
  /**
   * Property setupStore
   * @readonly
   * @description Browser journal that owns preparation, durable replay and batch request state.
   * @access protected
   * @since 1.1.0
   * @type {InstanceType<typeof OnboardingSetupStore>}
   */
  protected readonly setupStore = inject(OnboardingSetupStore);

  /**
   * Property restoredInvitations
   * @readonly
   * @description Prepared member rows restored from the server.
   * @access protected
   * @since 1.1.0
   * @type {Signal<readonly SetupInviteMemberInput[]>}
   */
  protected readonly restoredInvitations = computed(() =>
    this.setupStore
      .operations()
      .filter((op) => op.stepKey === 'invite_members')
      .map((op) => op.payload as SetupInviteMemberInput),
  );
  /**
   * Property completedInvitations
   * @readonly
   * @description Member rows durably created by this session.
   * @access protected
   * @since 1.1.0
   * @type {Signal<readonly SetupInviteMemberInput[]>}
   */
  protected readonly completedInvitations = computed(() =>
    this.setupStore
      .operations()
      .filter((op) => op.stepKey === 'invite_members' && op.status === 'completed')
      .map((op) => op.payload as SetupInviteMemberInput),
  );
  /**
   * Property restoredFacilities
   * @readonly
   * @description Prepared facility rows restored from the server.
   * @access protected
   * @since 1.1.0
   * @type {Signal<readonly SetupCreateFacilityInput[]>}
   */
  protected readonly restoredFacilities = computed(() =>
    this.setupStore
      .operations()
      .filter((op) => op.stepKey === 'create_first_facility')
      .map((op) => op.payload as SetupCreateFacilityInput),
  );
  /**
   * Property completedFacilityDrafts
   * @readonly
   * @description Facility rows durably created by this session.
   * @access protected
   * @since 1.1.0
   * @type {Signal<readonly SetupCreateFacilityInput[]>}
   */
  protected readonly completedFacilityDrafts = computed(() =>
    this.setupStore
      .operations()
      .filter((op) => op.stepKey === 'create_first_facility' && op.status === 'completed')
      .map((op) => op.payload as SetupCreateFacilityInput),
  );
  /**
   * Property singleOperation
   * @readonly
   * @description Persisted result or draft for the singleton organization/equipment step.
   * @access protected
   * @since 1.1.0
   * @type {Signal<OnboardingSetupOperation | undefined>}
   */
  protected readonly singleOperation = computed(() =>
    this.setupStore
      .operations()
      .find(
        (op) =>
          op.stepKey === this.store.nextStep() &&
          (op.stepKey === 'create_organization' || op.stepKey === 'create_first_equipment'),
      ),
  );
  /**
   * Property restoredOrganization
   * @readonly
   * @description Prepared organization name, only editable before creation.
   * @access protected
   * @since 1.1.0
   * @type {Signal<SetupCreateOrganizationInput | null>}
   */
  protected readonly restoredOrganization: Signal<SetupCreateOrganizationInput | null> = computed(
    () => {
      const operation = this.singleOperation();
      return operation?.stepKey === 'create_organization'
        ? (operation.payload as SetupCreateOrganizationInput)
        : null;
    },
  );
  /**
   * Property restoredEquipment
   * @readonly
   * @description Prepared equipment fields and assigned facility.
   * @access protected
   * @since 1.1.0
   * @type {Signal<SetupCreateEquipmentInput | null>}
   */
  protected readonly restoredEquipment = computed(() => {
    const operation = this.singleOperation();
    if (operation?.stepKey !== 'create_first_equipment') return null;
    const { facility, ...payload } = operation.payload as SetupCreateEquipmentInput & {
      facility?: string | null;
    };
    return { ...payload, facilityId: facility?.split('/').pop() };
  });
  /**
   * Property failedInvitations
   * @readonly
   * @description Failed member rows remain identifiable beside their retry action.
   * @access protected
   * @since 1.1.0
   * @type {Signal<readonly string[]>}
   */
  protected readonly failedInvitations = computed(() =>
    this.setupStore
      .operations()
      .filter(
        (op) =>
          op.stepKey === 'invite_members' && this.setupStore.failedItemKeys().includes(op.itemKey),
      )
      .map((op) => (op.payload as SetupInviteMemberInput).email),
  );
  /**
   * Property failedFacilities
   * @readonly
   * @description Failed facility rows remain identifiable beside their retry action.
   * @access protected
   * @since 1.1.0
   * @type {Signal<readonly string[]>}
   */
  protected readonly failedFacilities = computed(() =>
    this.setupStore
      .operations()
      .filter(
        (op) =>
          op.stepKey === 'create_first_facility' &&
          this.setupStore.failedItemKeys().includes(op.itemKey),
      )
      .map((op) => (op.payload as SetupCreateFacilityInput).name),
  );
  /**
   * Property host
   * @readonly
   * @description Locates the rendered step heading for keyboard focus after progression.
   * @access private
   * @since 1.1.0
   * @type {ElementRef<HTMLElement>}
   */
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);

  /**
   * Property injector
   * @readonly
   * @description Schedules browser-only focus after the new step has rendered.
   * @access private
   * @since 1.1.0
   * @type {Injector}
   */
  private readonly injector: Injector = inject(Injector);

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
   * Property actionFocus
   * @description Remembers the initiating control while a request temporarily disables it.
   * @access private
   * @since 1.1.0
   * @type {{ element: HTMLElement; stepKey: OnboardingStepKey | null } | null}
   */
  private actionFocus: { element: HTMLElement; stepKey: OnboardingStepKey | null } | null = null;

  /**
   * Method rememberActionFocus
   * @method rememberActionFocus
   * @description Captures the initiating control before native disabling blurs it; restoration never overrides another focused control.
   * @access private
   * @since 1.1.0
   * @returns {void}
   */
  private rememberActionFocus(): void {
    const active = this.document.activeElement;
    this.actionFocus =
      active && this.host.nativeElement.contains(active) && 'focus' in active
        ? { element: active as HTMLElement, stepKey: this.store.nextStep() }
        : null;
  }

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
   * @description The Billing checkout request state; resource creation belongs to OnboardingSetupStore.
   * @access protected
   * @since 1.0.0
   * @type {WritableSignal<CallState<void>>}
   */
  protected readonly actionState: WritableSignal<CallState<void>> = signal(idleCallState());

  /**
   * Property stepPending
   * @readonly
   * @description Combines durable setup, Billing and progression requests to prevent competing commands.
   * @access protected
   * @since 1.0.0
   * @type {Signal<boolean>}
   */
  protected readonly stepPending: Signal<boolean> = computed(
    () =>
      this.actionState().status === 'pending' ||
      this.setupStore.pending() ||
      this.store.isExecutingStep() ||
      this.store.isSkippingStep() ||
      this.store.isRollingBack(),
  );

  //#endregion

  //#region Lifecycle
  constructor() {
    let wasPending = false;
    effect(() => {
      const pending = this.stepPending();
      const failed = !!(
        this.lifecycleError() ||
        this.store.executeStepError() ||
        this.setupStore.batchCallState().error ||
        this.setupStore.loadCallState().error ||
        this.actionState().error
      );
      const settled = wasPending && !pending;
      wasPending = pending;
      if (!settled || !failed || !this.actionFocus) return;
      const origin = this.actionFocus;
      this.actionFocus = null;
      afterNextRender(
        () => {
          if (this.store.nextStep() !== origin.stepKey) return;
          const document = origin.element.ownerDocument;
          const active = document.activeElement;
          if (
            active &&
            active !== document.body &&
            active !== document.documentElement &&
            active !== origin.element
          )
            return;
          const target = origin.element.isConnected
            ? origin.element
            : this.host.nativeElement.querySelector<HTMLElement>(
                '[data-testid="onboarding-setup-confirm"]',
              );
          if (target && !target.hasAttribute('disabled')) target.focus();
        },
        { injector: this.injector },
      );
    });
    inject(Events)
      .on(onboardingSetupEvents.completed)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ payload }) => {
        this.store.executeStep({ stepKey: payload.stepKey });
      });
    let setupSnapshot: OnboardingOutput | null = null;
    effect(() => {
      const snapshot = this.store.onboarding();
      if (!snapshot || snapshot === setupSnapshot || this.setupStore.pending()) return;
      setupSnapshot = snapshot;
      untracked(() => this.setupStore.load(snapshot));
    });

    let previousStep: OnboardingStepKey | null = null;
    effect(() => {
      const step = this.store.nextStep();
      if (step === null) return;
      const changed = previousStep !== null && previousStep !== step;
      previousStep = step;
      if (!changed) return;
      afterNextRender(
        () => {
          if (this.store.nextStep() !== step) return;
          const heading = this.host.nativeElement.querySelector<HTMLElement>(
            '[data-step-heading] h1, [data-step-heading] h2',
          );
          if (!heading) return;
          heading.setAttribute('tabindex', '-1');
          heading.setAttribute(
            'aria-label',
            `${this.stepNumberLabel()} — ${this.stepPresentation()?.label ?? ''}`,
          );
          heading.focus();
        },
        { injector: this.injector },
      );
    });

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
  }

  /**
   * Method ngOnInit
   * @method ngOnInit
   * @description Loads the route-critical onboarding record after component creation.
   * @access public
   * @since 1.0.0
   * @returns {void}
   */
  public ngOnInit(): void {
    void this.store.initialize();
  }
  //#endregion

  //#region Methods
  /**
   * Method chooseWorkspace
   * @method chooseWorkspace
   *
   * @description
   * Opens organization discovery without rolling back the current creation record.
   * Retains only a validated local destination through the alternate entry path.
   *
   * @access protected
   * @since 1.1.0
   * @returns {void}
   */
  protected chooseWorkspace(): void {
    if (this.stepPending() || this.store.isBusy()) return;
    const returnUrl: string = resolveReturnUrl(
      this.route.snapshot.queryParamMap.get('returnUrl'),
      '/',
    );
    void this.router.navigateByUrl(
      `/onboarding/workspace?returnUrl=${encodeURIComponent(returnUrl)}`,
    );
  }

  /**
   * Method submitOrganization
   * @description Creates the organization, then confirms `create_organization`.
   * @access protected
   * @since 1.0.0
   * @param {SetupCreateOrganizationInput} input - The organization draft.
   * @returns {void}
   */
  protected submitOrganization(input: SetupCreateOrganizationInput): void {
    this.rememberActionFocus();
    this.setupStore.run({ stepKey: 'create_organization', payloads: [input] });
  }

  /**
   * Method submitMembers
   * @description Sends the staged invitations, then confirms `invite_members`.
   * @access protected
   * @since 1.0.0
   * @param {readonly SetupInviteMemberInput[]} invitations - The non-empty staged batch.
   * @returns {void}
   */
  protected submitMembers(invitations: readonly SetupInviteMemberInput[]): void {
    if (invitations.length === 0) return;
    this.rememberActionFocus();
    this.setupStore.run({ stepKey: 'invite_members', payloads: invitations });
  }

  /**
   * Method submitFacilities
   * @description Prepares and creates the facility batch through the durable setup store.
   * @access protected
   * @since 1.0.0
   * @param {readonly SetupCreateFacilityInput[]} facilities - The staged batch.
   * @returns {void}
   */
  protected submitFacilities(facilities: readonly SetupCreateFacilityInput[]): void {
    this.rememberActionFocus();
    this.setupStore.run({ stepKey: 'create_first_facility', payloads: facilities });
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
    this.rememberActionFocus();
    const { facilityId, ...payload } = input;
    this.setupStore.run({
      stepKey: 'create_first_equipment',
      payloads: [
        { ...payload, facility: facilityId ? `/api/facilities/${facilityId}` : undefined },
      ],
    });
  }

  /**
   * Method confirmSavedStep
   * @method confirmSavedStep
   * @description Confirms a server-recorded singleton resource without recreating it.
   * @access protected
   * @since 1.1.0
   * @returns {void}
   */
  protected confirmSavedStep(): void {
    this.rememberActionFocus();
    const operation = this.singleOperation();
    if (this.stepPending() || operation?.status !== 'completed') return;
    this.store.executeStep({ stepKey: operation.stepKey as OnboardingSetupStep });
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
    this.rememberActionFocus();
    if (this.stepPending()) return;
    if (selection.pricingState === 'free') {
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
          this.reportActionFailure(toStoreError(error));
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
    this.rememberActionFocus();
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
    this.rememberActionFocus();
    if (!this.store.canRollback() || this.stepPending()) return;
    this.store.rollback();
  }
  //#endregion

  //#region Internals
  /**
   * Method reportActionFailure
   * @method reportActionFailure
   * @description Keeps retry state and publishes one toast for a failed resource or batch request.
   * @access private
   * @since 1.0.0
   * @param {StoreError} failure - Normalized API failure.
   * @returns {void}
   */
  private reportActionFailure(failure: StoreError): void {
    this.actionState.set(errorCallState(failure));
    this.feedback.show(
      toStoreFailureEventPayload(
        failure,
        $localize`:@@onboarding.wizard.lifecycleFailed:This step could not be updated. Your saved information is still available.`,
      ),
    );
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
        error: (error: unknown) => {
          const failure: StoreError = toStoreError(error);
          this.planCatalogCallState.set(errorCallState(failure));
          this.feedback.show(
            toStoreFailureEventPayload(
              failure,
              $localize`:@@onboarding.wizard.catalogFailed:The available choices could not be loaded.`,
            ),
          );
        },
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
        error: (error: unknown) => {
          const failure: StoreError = toStoreError(error);
          this.rolesCallState.set(errorCallState(failure));
          this.feedback.show(
            toStoreFailureEventPayload(
              failure,
              $localize`:@@onboarding.wizard.catalogFailed:The available choices could not be loaded.`,
            ),
          );
        },
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
        error: (error: unknown) => {
          const failure: StoreError = toStoreError(error);
          this.facilitiesCallState.set(errorCallState(failure));
          this.feedback.show(
            toStoreFailureEventPayload(
              failure,
              $localize`:@@onboarding.wizard.catalogFailed:The available choices could not be loaded.`,
            ),
          );
        },
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
    this.rememberActionFocus();
    if (this.store.isBusy()) return;
    if (this.store.startCallState().error) void this.store.initialize();
    else if (this.store.skipStepCallState().error) this.skipCurrentStep();
    else if (this.store.rollbackCallState().error) this.rollbackStep();
    else this.store.load();
  }
}
