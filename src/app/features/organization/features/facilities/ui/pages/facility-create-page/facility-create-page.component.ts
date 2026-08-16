import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  untracked,
  viewChild,
  type InputSignal,
  type Signal,
  type TemplateRef,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { PageActionsService, registerPageActions } from '@core/page-actions';
import type { CallState } from '@core/request-state';
import type {
  CreateFacilityInput,
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
 * @version 1.1.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-facility-create-page',
  imports: [RouterLink, FacilityCreateForm, HlmButton, ...HlmCardImports],
  templateUrl: './facility-create-page.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacilityCreatePage {
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
  //#endregion

  //#region Properties
  /** The store this route provided. */
  protected readonly store: FacilityStoreType = inject<FacilityStoreType>(FacilityStore);

  /** Router used to open the new record once it exists. */
  private readonly router: Router = inject(Router);

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
    registerPageActions(this.pageActions, this.pageActionsService, inject(DestroyRef));

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
   * Method onCancelled
   * @description The operator backed out; returns to the facility list.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected onCancelled(): void {
    void this.router.navigate(['/organizations', this.organizationId(), 'facilities']);
  }
  //#endregion
}
