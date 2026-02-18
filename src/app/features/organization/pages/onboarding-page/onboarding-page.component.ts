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
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { Events } from '@ngrx/signals/events';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { StepperModule } from 'primeng/stepper';
import { OrganizationStore, organizationStoreEvents } from '@core/stores/organization';
import type {
  CreateFirstFacilityOnboardingInput,
  OrganizationOnboardingStatusOutput,
  OrganizationOnboardingStep,
  OrganizationOnboardingStepKey,
  OrganizationOnboardingStepStatus,
  UpsertOrganizationLegalProfileInput,
} from '@core/models/organization';
import {
  OnboardingFirstFacilityForm,
  type OnboardingFirstFacilityFormValues,
  OnboardingLegalProfileForm,
  type OnboardingLegalProfileFormValues,
  OnboardingOrganizationForm,
  type OnboardingOrganizationFormValues,
} from '@features/organization/forms';

type OnboardingStepViewModel = OrganizationOnboardingStep & {
  readonly value: number;
  readonly statusLabel: string;
  readonly reasonLabel: string | null;
};

const STEP_DESCRIPTION_BY_KEY: Record<OrganizationOnboardingStepKey, string> = {
  create_organization: 'This organization will own your facilities and team.',
  complete_legal_profile: 'Provide legal identity data required to activate your organization.',
  create_first_facility: 'This facility initializes your organization structure.',
} as const;

const STEP_STATUS_LABEL_BY_STATUS: Record<OrganizationOnboardingStepStatus, string> = {
  pending: 'Pending',
  completed: 'Completed',
  blocked: 'Blocked',
  skipped: 'Skipped',
} as const;

const STEP_STATUS_CLASS_BY_STATUS: Record<OrganizationOnboardingStepStatus, string> = {
  pending: 'bg-surface-100 text-surface-700',
  completed: 'bg-green-100 text-green-700',
  blocked: 'bg-red-100 text-red-700',
  skipped: 'bg-amber-100 text-amber-700',
} as const;

/**
 * Component OnboardingPage
 * @class OnboardingPage
 *
 * @description
 * Unified onboarding page managing the full flow:
 * organization creation, legal profile completion,
 * then first facility creation.
 *
 * @version 1.0.0
 */
@Component({
  selector: 'app-onboarding-page',
  imports: [
    ButtonModule,
    ProgressSpinnerModule,
    StepperModule,
    OnboardingOrganizationForm,
    OnboardingLegalProfileForm,
    OnboardingFirstFacilityForm,
  ],
  templateUrl: './onboarding-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardingPage {
  //#region Properties
  /**
   * Property organizationStore
   * @readonly
   *
   * @description
   * Organization onboarding state store.
   *
   * @access protected
   * @type {OrganizationStore}
   */
  protected readonly organizationStore: OrganizationStore =
    inject<OrganizationStore>(OrganizationStore);

  /**
   * Property router
   * @readonly
   *
   * @description
   * Angular router for redirection.
   *
   * @access private
   * @type {Router}
   */
  private readonly router: Router = inject<Router>(Router);

  /**
   * Property events
   * @readonly
   *
   * @description
   * NgRx events stream.
   *
   * @access private
   * @type {Events}
   */
  private readonly events: Events = inject<Events>(Events);

  /**
   * Property messageService
   * @readonly
   *
   * @description
   * PrimeNG message service for toast notifications.
   *
   * @access private
   * @type {MessageService}
   */
  private readonly messageService: MessageService =
    inject<MessageService>(MessageService);

  /**
   * Property resolving
   * @readonly
   *
   * @description
   * Local state indicating route resolution is in progress.
   *
   * @access private
   * @type {WritableSignal<boolean>}
   */
  private readonly resolving: WritableSignal<boolean> = signal<boolean>(true);

  /**
   * Property activeStep
   * @readonly
   *
   * @description
   * Active step index for the PrimeNG Stepper.
   *
   * @access protected
   * @type {WritableSignal<number>}
   */
  protected readonly activeStep: WritableSignal<number> = signal<number>(1);

  /**
   * Property stepDescriptionByKey
   * @readonly
   *
   * @description
   * Description text displayed for each onboarding step key.
   *
   * @access protected
   * @type {Record<OrganizationOnboardingStepKey, string>}
   */
  protected readonly stepDescriptionByKey: Record<
    OrganizationOnboardingStepKey,
    string
  > = STEP_DESCRIPTION_BY_KEY;

  /**
   * Property stepStatusClassByStatus
   * @readonly
   *
   * @description
   * Tailwind classes for visual step status badges.
   *
   * @access protected
   * @type {Record<OrganizationOnboardingStepStatus, string>}
   */
  protected readonly stepStatusClassByStatus: Record<
    OrganizationOnboardingStepStatus,
    string
  > = STEP_STATUS_CLASS_BY_STATUS;

  /**
   * Computed onboardingSteps
   * @readonly
   *
   * @description
   * Stepper view model generated from backend `steps[]`.
   *
   * @access protected
   * @type {Signal<readonly OnboardingStepViewModel[]>}
   */
  protected readonly onboardingSteps: Signal<readonly OnboardingStepViewModel[]> =
    computed<readonly OnboardingStepViewModel[]>(() => {
      const steps: readonly OrganizationOnboardingStep[] =
        this.organizationStore.onboardingStatus()?.steps ?? [];

      return steps.map((step, index) => ({
        ...step,
        value: index + 1,
        statusLabel: STEP_STATUS_LABEL_BY_STATUS[step.status],
        reasonLabel: step.reason ? this.formatReason(step.reason) : null,
      }));
    });

  /**
   * Computed isBlocked
   * @readonly
   *
   * @description
   * Indicates if onboarding is currently blocked.
   *
   * @access protected
   * @type {Signal<boolean>}
   */
  protected readonly isBlocked: Signal<boolean> = computed<boolean>(
    () => this.organizationStore.onboardingStatus()?.state === 'blocked',
  );

  /**
   * Computed blockedReason
   * @readonly
   *
   * @description
   * Human-readable global blocked reason.
   *
   * @access protected
   * @type {Signal<string | null>}
   */
  protected readonly blockedReason: Signal<string | null> = computed<string | null>(
    () => {
      const reason: string | null =
        this.organizationStore.onboardingStatus()?.blockedReason ?? null;
      return reason ? this.formatReason(reason) : null;
    },
  );

  /**
   * Computed blockedStepReasons
   * @readonly
   *
   * @description
   * Blocked reasons extracted from individual steps.
   *
   * @access protected
   * @type {Signal<readonly string[]>}
   */
  protected readonly blockedStepReasons: Signal<readonly string[]> =
    computed<readonly string[]>(() =>
      this.onboardingSteps()
        .filter((step) => step.status === 'blocked' && !!step.reasonLabel)
        .map((step) => `${step.label}: ${step.reasonLabel}`),
    );

  /**
   * Computed loading
   * @readonly
   *
   * @description
   * Combined loading state for onboarding resolution.
   *
   * @access protected
   * @type {Signal<boolean>}
   */
  protected readonly loading: Signal<boolean> = computed<boolean>(
    () =>
      this.resolving() ||
      this.organizationStore.isOnboardingSubmitting() ||
      this.organizationStore.isOnboardingStatusLoading(),
  );

  /**
   * Computed statusLoading
   * @readonly
   *
   * @description
   * Loading state for onboarding status retrieval.
   *
   * @access protected
   * @type {Signal<boolean>}
   */
  protected readonly statusLoading: Signal<boolean> = computed<boolean>(
    () => this.resolving() || this.organizationStore.isOnboardingStatusLoading(),
  );

  /**
   * Computed hasError
   * @readonly
   *
   * @description
   * Whether onboarding status resolution failed.
   *
   * @access protected
   * @type {Signal<boolean>}
   */
  protected readonly hasError: Signal<boolean> = computed<boolean>(
    () =>
      !this.resolving() &&
      this.organizationStore.onboardingStatusLoadOperation().status === 'error' &&
      this.organizationStore.onboardingStatus() === null,
  );
  //#endregion

  //#region Constructor
  /**
   * Constructor
   *
   * @description
   * Initializes onboarding status and handles operation feedback.
   */
  public constructor() {
    effect(() => {
      const status = this.organizationStore.onboardingStatus();
      if (!status) return;

      this.resolving.set(false);

      if (status.state === 'completed') {
        void this.router.navigateByUrl('/');
        return;
      }

      this.activeStep.set(this.resolveActiveStep(status));
    });

    this.events
      .on(organizationStoreEvents.organizationLegalTypeOptionsLoadFailed)
      .pipe(takeUntilDestroyed())
      .subscribe(({ payload }) => {
        this.messageService.add({
          severity: 'warn',
          summary: 'Warning',
          detail: payload.message,
          life: 5000,
        });
      });

    this.events
      .on(organizationStoreEvents.facilityTypeOptionsLoadFailed)
      .pipe(takeUntilDestroyed())
      .subscribe(({ payload }) => {
        this.messageService.add({
          severity: 'warn',
          summary: 'Warning',
          detail: payload.message,
          life: 5000,
        });
      });

    this.events
      .on(organizationStoreEvents.onboardingStatusLoadFailed)
      .pipe(takeUntilDestroyed())
      .subscribe(({ payload }) => {
        if (this.organizationStore.onboardingStatus() !== null) return;

        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: payload.message,
          life: 5000,
        });
      });

    this.events
      .on(organizationStoreEvents.onboardingOrganizationCreateFailed)
      .pipe(takeUntilDestroyed())
      .subscribe(({ payload }) => {
        const isSlugConflict: boolean = payload.code === 409;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: isSlugConflict
            ? 'This slug is already used. Please choose another one.'
            : payload.message,
          life: 5000,
        });
      });

    this.events
      .on(organizationStoreEvents.onboardingLegalProfileUpsertFailed)
      .pipe(takeUntilDestroyed())
      .subscribe(({ payload }) => {
        const isValidationError: boolean = payload.code === 400;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: isValidationError
            ? 'Invalid legal profile data. Please review required fields.'
            : payload.message,
          life: 5000,
        });
      });

    this.events
      .on(organizationStoreEvents.onboardingFirstFacilityCreateFailed)
      .pipe(takeUntilDestroyed())
      .subscribe(({ payload }) => {
        const isConflict: boolean = payload.code === 409;
        this.messageService.add({
          severity: isConflict ? 'warn' : 'error',
          summary: isConflict ? 'Already configured' : 'Error',
          detail: isConflict
            ? 'A first facility already exists. Refreshing onboarding state.'
            : payload.message,
          life: 5000,
        });

        if (isConflict) {
          void this.refreshStatus();
        }
      });

    this.loadReferenceData();
    void this.refreshStatus();
  }
  //#endregion

  //#region Methods
  /**
   * Method retry
   *
   * @description
   * Retries onboarding status retrieval after a failure.
   */
  protected retry(): void {
    this.loadReferenceData();
    void this.refreshStatus();
  }

  /**
   * Method submitOrganization
   *
   * @description
   * Submits organization creation step.
   */
  protected submitOrganization(values: OnboardingOrganizationFormValues): void {
    const normalizedSlug: string = values.slug.trim();

    this.organizationStore.submitOnboardingOrganization({
      name: values.name.trim(),
      slug: normalizedSlug.length ? normalizedSlug : undefined,
    });
  }

  /**
   * Method submitLegalProfile
   *
   * @description
   * Submits legal profile upsert step.
   */
  protected submitLegalProfile(values: OnboardingLegalProfileFormValues): void {
    const organizationId: string | null =
      this.organizationStore.onboardingStatus()?.targetOrganizationId ?? null;

    if (!organizationId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Missing organization identifier.',
        life: 5000,
      });
      return;
    }

    const registrationNumber: string = values.registrationNumber.trim();
    const vatNumber: string = values.vatNumber.trim();

    const payload: UpsertOrganizationLegalProfileInput = {
      legalType: values.legalType,
      legalName: values.legalName.trim(),
      registrationNumber: registrationNumber.length ? registrationNumber : undefined,
      vatNumber: vatNumber.length ? vatNumber : undefined,
    };

    this.organizationStore.submitOnboardingLegalProfile({
      organizationId,
      payload,
    });
  }

  /**
   * Method submitFirstFacility
   *
   * @description
   * Submits first facility creation step.
   */
  protected submitFirstFacility(values: OnboardingFirstFacilityFormValues): void {
    const organizationId: string | null =
      this.organizationStore.onboardingStatus()?.targetOrganizationId ?? null;

    if (!organizationId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Missing organization identifier.',
        life: 5000,
      });
      return;
    }

    const metadata: Record<string, unknown> = {};
    const country: string = values.country.trim();
    const timezone: string = values.timezone.trim();

    if (country.length) metadata['country'] = country.toUpperCase();
    if (timezone.length) metadata['timezone'] = timezone;

    const payload: CreateFirstFacilityOnboardingInput = {
      type: values.type,
      name: values.name.trim(),
      code: values.code.trim() || undefined,
      address: values.address.trim() || undefined,
      metadata: Object.keys(metadata).length ? metadata : undefined,
    };

    this.organizationStore.submitOnboardingFirstFacility({
      organizationId,
      payload,
    });
  }

  /**
   * Method resolveActiveStep
   *
   * @description
   * Resolves the active step index from backend status.
   *
   * @param {OrganizationOnboardingStatusOutput} status - Current onboarding status.
   *
   * @returns {number}
   */
  private resolveActiveStep(status: OrganizationOnboardingStatusOutput): number {
    if (!status.steps.length) return 1;

    if (status.nextStep) {
      const nextStepIndex: number = status.steps.findIndex(
        (step) => step.key === status.nextStep,
      );
      if (nextStepIndex >= 0) return nextStepIndex + 1;
    }

    const fallbackStepIndex: number = status.steps.findIndex(
      (step) => step.status === 'pending' || step.status === 'blocked',
    );
    return fallbackStepIndex >= 0 ? fallbackStepIndex + 1 : 1;
  }

  /**
   * Method formatReason
   *
   * @description
   * Transforms backend reason keys into readable labels.
   *
   * @param {string} reason - Raw backend reason.
   *
   * @returns {string}
   */
  private formatReason(reason: string): string {
    const normalized: string = reason.replaceAll('_', ' ');
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }

  /**
   * Method refreshStatus
   *
   * @description
   * Retrieves onboarding status from backend.
   *
   * @returns {Promise<void>}
   */
  private async refreshStatus(): Promise<void> {
    this.resolving.set(true);
    const response = await this.organizationStore.syncOnboardingStatus();

    if (!response) {
      this.resolving.set(false);
    }
  }

  /**
   * Method loadReferenceData
   *
   * @description
   * Loads onboarding reference data used by forms.
   */
  private loadReferenceData(): void {
    this.organizationStore.loadOrganizationLegalTypeOptions();
    this.organizationStore.loadFacilityTypeOptions();
  }
  //#endregion
}
