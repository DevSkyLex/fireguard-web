import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
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
  CreateInspectionInput,
  InspectionOutput,
} from '@features/organization/features/inspections/models';
import {
  InspectionStore,
  type InspectionStoreType,
} from '@features/organization/features/inspections/state';
import { InspectionCreationOptionsStore } from '@features/organization/features/inspections/state/inspection-creation-options';
import { HlmButton } from '@shared/ui/button';
import { HlmCardImports } from '@shared/ui/card';
import { InspectionCreateForm } from '../../forms/inspection-create-form';

/**
 * Component InspectionCreatePage
 * @class InspectionCreatePage
 *
 * @description
 * Route entry page for opening an inspection
 * (`/organizations/:organizationId/inspections/create`). Renders
 * {@link InspectionCreateForm} inside a card, loading the equipment picker's
 * options on arrival, calls the store on submit, and navigates to the new
 * record once it exists — `notes` and `signature` are filled in afterward,
 * in place, on the created record (`FEATURE.md` "The record is the edit
 * surface").
 *
 * Its title lives in the shell breadcrumb (the route's static title); "Back
 * to inspections" registers on the shell header through `PageActionsService`.
 *
 * @version 1.1.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-inspection-create-page',
  imports: [RouterLink, InspectionCreateForm, HlmButton, ...HlmCardImports],
  providers: [InspectionCreationOptionsStore],
  templateUrl: './inspection-create-page.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InspectionCreatePage {
  //#region Inputs
  /**
   * Property organizationId
   * @readonly
   * @description The workspace the new inspection belongs to, bound from the route.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string>}
   */
  public readonly organizationId: InputSignal<string> = input.required<string>();
  //#endregion

  //#region Properties
  /** The store this route provided. */
  protected readonly store: InspectionStoreType = inject<InspectionStoreType>(InspectionStore);

  /** The equipment picker's options, loaded on arrival. */
  protected readonly creationOptions: InspectionCreationOptionsStore = inject(
    InspectionCreationOptionsStore,
  );

  /** Router used to open the new record once it exists. */
  private readonly router: Router = inject(Router);

  /** Registers {@link pageActions} on the shell header. */
  private readonly pageActionsService: PageActionsService = inject(PageActionsService);

  /** The "Back to inspections" link, registered on the shell header instead of an in-page title band. */
  private readonly pageActions: Signal<TemplateRef<unknown> | undefined> =
    viewChild<TemplateRef<unknown>>('pageActions');
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Loads the equipment picker's options, navigates to the created record
   * once the write settles successfully, and registers {@link pageActions}.
   *
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    registerPageActions(this.pageActions, this.pageActionsService, inject(DestroyRef));

    effect((): void => {
      const organizationId: string = this.organizationId();

      untracked((): void => {
        this.creationOptions.loadEquipmentOptions(organizationId);
      });
    });

    effect((): void => {
      const state: CallState<InspectionOutput | null> = this.store.createCallState();

      untracked((): void => {
        if (state.status !== 'success' || !state.data) return;

        const created: InspectionOutput = state.data;
        this.store.resetCreateOperation();
        void this.router.navigate([
          '/organizations',
          this.organizationId(),
          'inspections',
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
   * @param {CreateInspectionInput} payload - The validated payload.
   * @returns {void}
   */
  protected onSubmitted(payload: CreateInspectionInput): void {
    this.store.create({ organizationId: this.organizationId(), input: payload });
  }

  /**
   * Method onCancelled
   * @description The operator backed out; returns to the inspection list.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected onCancelled(): void {
    void this.router.navigate(['/organizations', this.organizationId(), 'inspections']);
  }
  //#endregion
}
