import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
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
import { Router, RouterLink } from '@angular/router';
import type { BrnDialogState } from '@spartan-ng/brain/dialog';
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
import type { FacilityOption } from '@features/organization/features/facilities/models';
import { FacilityOptionsStore } from '@features/organization/features/facilities/state';
import { HlmButton } from '@shared/ui/button';
import { HlmCardImports } from '@shared/ui/card';
import { UnsavedChangesDialog, type UnsavedChangesAware } from '@shared/unsaved-changes';
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
 * Implements `UnsavedChangesAware` so `unsavedChangesGuard`
 * (`equipments.routes.ts`) can stop navigation while the form holds unsaved
 * work, hosting the shared {@link UnsavedChangesDialog} to resolve its own
 * confirmation.
 *
 * @version 1.2.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */

@Component({
  selector: 'app-equipment-create-page',
  imports: [RouterLink, EquipmentCreateForm, UnsavedChangesDialog, HlmButton, ...HlmCardImports],
  providers: [FacilityOptionsStore],
  templateUrl: './equipment-create-page.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EquipmentCreatePage implements UnsavedChangesAware {
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

  /**
   * Property facility
   * @readonly
   *
   * @description
   * The site the caller wants this equipment in, bound from `?facility=`. It is
   * what carries context from the asset explorer's selected site into the form:
   * without it, "New equipment" on a selected site produced an unassigned
   * record the operator then had to assign by hand from the detail page.
   *
   * @access public
   * @since 2.0.0
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly facility: InputSignal<string | undefined> = input<string | undefined>(undefined);

  /** The organization's sites, offered by the form's Site field. */
  protected readonly facilityOptions: Signal<readonly FacilityOption[]> = computed(() =>
    this.facilityOptionsStore.options(),
  );
  //#endregion

  //#region Properties
  /** The store this route provided. */
  protected readonly store: EquipmentStoreType = inject<EquipmentStoreType>(EquipmentStore);

  /** Router used to open the new record once it exists. */
  private readonly router: Router = inject(Router);

  private readonly facilityOptionsStore: FacilityOptionsStore =
    inject<FacilityOptionsStore>(FacilityOptionsStore);

  private readonly destroyRef: DestroyRef = inject(DestroyRef);

  /** Whether {@link EquipmentCreateForm}'s field tree currently holds unsaved work. */
  protected readonly formDirty: WritableSignal<boolean> = signal<boolean>(false);

  /** The shared "discard your edits?" dialog's open/closed state. */
  protected readonly unsavedChangesDialogState: WritableSignal<BrnDialogState> =
    signal<BrnDialogState>('closed');

  /** Resolves the promise {@link confirmDeactivation} handed to `unsavedChangesGuard`. */
  private confirmDeactivationResolve: ((confirmed: boolean) => void) | null = null;

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
   * @description Navigates to the created record once the write settles successfully (resetting the create operation only after the navigation resolves, so `unsavedChangesGuard` still sees the success), and registers {@link pageActions}.
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    registerPageActions(this.pageActions, this.pageActionsService, inject(DestroyRef));

    effect((): void => {
      const organizationId: string = this.organizationId();

      untracked((): void => this.facilityOptionsStore.ensureLoaded(organizationId));
    });

    effect((): void => {
      const state: CallState<EquipmentOutput | null> = this.store.createCallState();

      untracked((): void => {
        if (state.status !== 'success' || !state.data) return;

        const created: EquipmentOutput = state.data;
        void this.router
          .navigate(['/organizations', this.organizationId(), 'equipments', created.id])
          .then((): void => this.store.resetCreateOperation());
      });
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method onSubmitted
   * @description Sends the form's payload to the store, ignoring re-entries while a create is already in flight.
   * @access protected
   * @since 1.0.0
   * @param {CreateEquipmentInput} payload - The validated payload.
   * @returns {void}
   */
  protected onSubmitted(payload: CreateEquipmentInput): void {
    if (this.store.isCreating()) return;

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

  /**
   * Method hasUnsavedChanges
   * @description `UnsavedChangesAware`: unsaved work is a dirty field tree with no write in flight or already settled.
   * @access public
   * @since 1.2.0
   * @returns {boolean} Whether leaving now would discard work.
   */
  public hasUnsavedChanges(): boolean {
    const status: CallState<EquipmentOutput | null>['status'] = this.store.createCallState().status;

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
