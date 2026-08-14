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
  CreateEquipmentInput,
  EquipmentOutput,
} from '@features/organization/features/equipments/models';
import {
  EquipmentStore,
  type EquipmentStoreType,
} from '@features/organization/features/equipments/state';
import { HlmButton } from '@shared/ui/button';
import { HlmCardImports } from '@shared/ui/card';
import { EquipmentCreateForm } from '../../forms/equipment-create-form';

/**
 * Component EquipmentCreatePage
 * @class EquipmentCreatePage
 *
 * @description
 * Route entry page for registering an equipment
 * (`/organizations/:organizationId/equipments/create`). Renders
 * {@link EquipmentCreateForm} inside a card, calls the store on submit, and
 * navigates to the new record once it exists — the record is where every
 * remaining property is filled in, in place (`FEATURE.md` "The record is
 * the edit surface"), so this page asks for nothing beyond the one required
 * field.
 *
 * Its title lives in the shell breadcrumb (the route's static title); "Back
 * to equipment" registers on the shell header through `PageActionsService`.
 *
 * @version 1.1.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-equipment-create-page',
  imports: [RouterLink, EquipmentCreateForm, HlmButton, ...HlmCardImports],
  templateUrl: './equipment-create-page.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EquipmentCreatePage {
  //#region Inputs
  /**
   * Property organizationId
   * @readonly
   * @description The workspace the new equipment belongs to, bound from the route.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string>}
   */
  public readonly organizationId: InputSignal<string> = input.required<string>();
  //#endregion

  //#region Properties
  /** The store this route provided. */
  protected readonly store: EquipmentStoreType = inject<EquipmentStoreType>(EquipmentStore);

  /** Router used to open the new record once it exists. */
  private readonly router: Router = inject(Router);

  /** Registers {@link pageActions} on the shell header. */
  private readonly pageActionsService: PageActionsService = inject(PageActionsService);

  /** The "Back to equipment" link, registered on the shell header instead of an in-page title band. */
  private readonly pageActions: Signal<TemplateRef<unknown> | undefined> =
    viewChild<TemplateRef<unknown>>('pageActions');
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   * @description Navigates to the created record once the write settles successfully, and registers {@link pageActions}.
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    registerPageActions(this.pageActions, this.pageActionsService, inject(DestroyRef));

    effect((): void => {
      const state: CallState<EquipmentOutput | null> = this.store.createCallState();

      untracked((): void => {
        if (state.status !== 'success' || !state.data) return;

        const created: EquipmentOutput = state.data;
        this.store.resetCreateOperation();
        void this.router.navigate([
          '/organizations',
          this.organizationId(),
          'equipments',
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
   * @param {CreateEquipmentInput} payload - The validated payload.
   * @returns {void}
   */
  protected onSubmitted(payload: CreateEquipmentInput): void {
    this.store.create({ organizationId: this.organizationId(), input: payload });
  }

  /**
   * Method onCancelled
   * @description The operator backed out; returns to the equipment list.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected onCancelled(): void {
    void this.router.navigate(['/organizations', this.organizationId(), 'equipments']);
  }
  //#endregion
}
