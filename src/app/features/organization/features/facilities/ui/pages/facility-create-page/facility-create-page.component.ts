import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
  type InputSignal,
  type Signal,
  type WritableSignal,
  type TemplateRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import type { BrnDialogState } from '@spartan-ng/brain/dialog';
import { take } from 'rxjs';
import { isApiError } from '@core/api/utils';
import { FeedbackService } from '@core/feedback';
import { PageActionsService, registerPageActions } from '@core/page-actions';
import type { CallState } from '@core/request-state';
import { FacilityService } from '@features/organization/features/facilities/data-access';
import type {
  CreateFacilityInput,
  FacilityGeocodeOutput,
  FacilityOutput,
} from '@features/organization/features/facilities/models';
import {
  FacilityStore,
  type FacilityStoreType,
} from '@features/organization/features/facilities/state';
import { resolveFacilityMapCenter } from '@features/organization/features/facilities/utils';
import type { MapCoordinates } from '@shared/map';
import { HlmButton } from '@shared/ui/button';
import { HlmCardImports } from '@shared/ui/card';
import { UnsavedChangesDialog, type UnsavedChangesAware } from '@shared/unsaved-changes';
import { FacilityCreateForm } from '../../forms/facility-create-form';

/**
 * Component FacilityCreatePage
 * @class FacilityCreatePage
 *
 * @description
 * Route entry page for registering a facility
 * (`/organizations/:organizationId/facilities/create`). Renders
 * {@link FacilityCreateForm} inside a card, loads the organization's
 * existing facilities as candidate parents, calls the store on submit, and
 * navigates to the new record once it exists — the record is where every
 * remaining property is filled in or refined, in place (`FEATURE.md` "The
 * record is the edit surface").
 *
 * Its title lives in the shell breadcrumb (the route's static title); "Back
 * to facilities" registers on the shell header through `PageActionsService`.
 *
 * Implements `UnsavedChangesAware` so `unsavedChangesGuard`
 * (`facilities.routes.ts`) can stop navigation while the form holds unsaved
 * work, hosting the shared {@link UnsavedChangesDialog} to resolve its own
 * confirmation.
 *
 * @version 1.3.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-facility-create-page',
  imports: [RouterLink, FacilityCreateForm, UnsavedChangesDialog, HlmButton, ...HlmCardImports],
  templateUrl: './facility-create-page.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacilityCreatePage implements UnsavedChangesAware {
  //#region Inputs
  /**
   * Property organizationId
   * @readonly
   * @description The workspace the new facility belongs to, bound from the route.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string>}
   */
  public readonly organizationId: InputSignal<string> = input.required<string>();

  /**
   * Property parent
   * @readonly
   * @description The parent site the caller picked, bound from `?parent=`.
   * @access public
   * @since 2.0.0
   * @type {InputSignal<string | undefined>}
   */
  public readonly parent: InputSignal<string | undefined> = input<string | undefined>(undefined);
  //#endregion

  //#region Properties
  /** The store this route provided. */
  protected readonly store: FacilityStoreType = inject<FacilityStoreType>(FacilityStore);

  /** Router used to open the new record once it exists. */
  private readonly router: Router = inject(Router);

  /** Transport used directly for the one-shot "Locate address" lookup — a helper, not list state. */
  private readonly facilityService: FacilityService = inject(FacilityService);

  /** Global toast feedback for the lookup's rate-limit and error paths. */
  private readonly feedback: FeedbackService = inject(FeedbackService);

  /** Unsubscribes an in-flight lookup when the page is destroyed. */
  private readonly destroyRef: DestroyRef = inject(DestroyRef);

  /** Whether a "Locate address" lookup is in flight. */
  protected readonly geocodePending: WritableSignal<boolean> = signal<boolean>(false);

  /** The latest successful lookup, handed to the form to fill the coordinate drafts. */
  protected readonly geocodeResult: WritableSignal<FacilityGeocodeOutput | null> =
    signal<FacilityGeocodeOutput | null>(null);

  /** Whether the latest lookup answered `404` — the form's non-blocking inline message. */
  protected readonly geocodeNotFound: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property parentOptions
   * @readonly
   * @description The organization's facilities, offered as candidate parents.
   * @access protected
   * @since 1.0.0
   * @type {Signal<ReadonlyArray<{ readonly value: string; readonly label: string }>>}
   */
  protected readonly parentOptions: Signal<
    ReadonlyArray<{ readonly value: string; readonly label: string }>
  > = computed(() =>
    this.store.facilities().map((facility: FacilityOutput) => ({
      value: facility.id,
      label: facility.name,
    })),
  );

  /**
   * Property mapCenter
   * @readonly
   * @description Where the create form's "Pick on map" picker opens by default, averaged from the already-loaded parent-facility candidates — no extra fetch for this alone.
   * @access protected
   * @since 1.2.0
   * @type {Signal<MapCoordinates | undefined>}
   */
  protected readonly mapCenter: Signal<MapCoordinates | undefined> = computed(() =>
    resolveFacilityMapCenter(null, this.store.facilities()),
  );

  /** Whether {@link FacilityCreateForm}'s field tree currently holds unsaved work. */
  protected readonly formDirty: WritableSignal<boolean> = signal<boolean>(false);

  /** The shared "discard your edits?" dialog's open/closed state. */
  protected readonly unsavedChangesDialogState: WritableSignal<BrnDialogState> =
    signal<BrnDialogState>('closed');

  /** Resolves the promise {@link confirmDeactivation} handed to `unsavedChangesGuard`. */
  private confirmDeactivationResolve: ((confirmed: boolean) => void) | null = null;

  /** Registers {@link pageActions} on the shell header. */
  private readonly pageActionsService: PageActionsService = inject(PageActionsService);

  /** The "Back to facilities" link, registered on the shell header instead of an in-page title band. */
  private readonly pageActions: Signal<TemplateRef<unknown> | undefined> =
    viewChild<TemplateRef<unknown>>('pageActions');
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   * @description Loads the parent-facility candidates, navigates to the created record once the write settles successfully, and registers {@link pageActions}.
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    registerPageActions(this.pageActions, this.pageActionsService, this.destroyRef);

    effect((): void => {
      const organizationId: string = this.organizationId();

      untracked((): void => this.store.ensureParentOptionsLoaded(organizationId));
    });

    effect((): void => {
      const state: CallState<FacilityOutput | null> = this.store.createCallState();

      untracked((): void => {
        if (state.status !== 'success' || !state.data) return;

        const created: FacilityOutput = state.data;
        this.store.resetCreateOperation();
        void this.router.navigate([
          '/organizations',
          this.organizationId(),
          'facilities',
          created.id,
        ]);
      });
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method onSubmitted
   * @description Sends the form's payload to the store.
   * @access protected
   * @since 1.0.0
   * @param {CreateFacilityInput} payload - The validated payload.
   * @returns {void}
   */
  protected onSubmitted(payload: CreateFacilityInput): void {
    this.store.create({ organizationId: this.organizationId(), input: payload });
  }

  /**
   * Method onGeocodeRequested
   *
   * @description
   * Resolves the form's address draft to coordinates
   * (`FacilityService.geocode`) and answers through the form's
   * `geocodeResult` / `geocodeNotFound` inputs. A `404` (no match) renders
   * inline and never blocks the form; any other refusal — the endpoint's
   * `429` rate limit, a `400` — surfaces its RFC 7807 `detail` as an error
   * toast. The operator can always correct the filled coordinates by hand.
   *
   * @access protected
   * @since 1.3.0
   *
   * @param {string} address - The trimmed address the form asked to locate.
   * @returns {void}
   */
  protected onGeocodeRequested(address: string): void {
    if (this.geocodePending()) return;

    this.geocodePending.set(true);
    this.geocodeResult.set(null);
    this.geocodeNotFound.set(false);

    this.facilityService
      .geocode(this.organizationId(), address)
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (match: FacilityGeocodeOutput): void => {
          this.geocodePending.set(false);
          this.geocodeResult.set(match);
        },
        error: (error: unknown): void => {
          this.geocodePending.set(false);

          if (isApiError(error) && error.status === 404) {
            this.geocodeNotFound.set(true);
            return;
          }

          this.feedback.error(
            isApiError(error)
              ? error.detail
              : $localize`:@@facility.form.locateFailed:Couldn't locate the address.`,
          );
        },
      });
  }

  /**
   * Method onCancelled
   * @description The operator backed out; returns to the facility list.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected onCancelled(): void {
    void this.router.navigate(['/organizations', this.organizationId(), 'facilities']);
  }

  /**
   * Method hasUnsavedChanges
   * @description `UnsavedChangesAware`: unsaved work is a dirty field tree with no write in flight or already settled.
   * @access public
   * @since 1.2.0
   * @returns {boolean} Whether leaving now would discard work.
   */
  public hasUnsavedChanges(): boolean {
    const status: CallState<FacilityOutput | null>['status'] = this.store.createCallState().status;

    return this.formDirty() && status !== 'pending' && status !== 'success';
  }

  /**
   * Method confirmDeactivation
   * @description `UnsavedChangesAware`: opens the hosted {@link UnsavedChangesDialog} and resolves once the reader picks Cancel or Discard.
   * @access public
   * @since 1.2.0
   * @returns {Promise<boolean>} Resolves `true` when the reader confirms leaving.
   */
  public confirmDeactivation(): Promise<boolean> {
    this.unsavedChangesDialogState.set('open');

    return new Promise<boolean>((resolve: (confirmed: boolean) => void): void => {
      this.confirmDeactivationResolve = resolve;
    });
  }

  /**
   * Method onUnsavedChangesConfirmed
   * @description Resolves the pending deactivation as confirmed.
   * @access protected
   * @since 1.2.0
   * @returns {void}
   */
  protected onUnsavedChangesConfirmed(): void {
    this.unsavedChangesDialogState.set('closed');
    this.confirmDeactivationResolve?.(true);
    this.confirmDeactivationResolve = null;
  }

  /**
   * Method onUnsavedChangesDismissed
   * @description Resolves the pending deactivation as cancelled.
   * @access protected
   * @since 1.2.0
   * @returns {void}
   */
  protected onUnsavedChangesDismissed(): void {
    this.unsavedChangesDialogState.set('closed');
    this.confirmDeactivationResolve?.(false);
    this.confirmDeactivationResolve = null;
  }
  //#endregion
}
