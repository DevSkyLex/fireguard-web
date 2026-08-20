import {
  ChangeDetectionStrategy,
  Component,
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
import { ChecklistStore } from '@features/organization/features/checklists/state';
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
import { UnsavedChangesDialog, type UnsavedChangesAware } from '@shared/unsaved-changes';
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
 * Also provides a component-scoped {@link ChecklistStore} and loads its
 * active checklist templates on arrival
 * (`ChecklistStore.ensureInspectionCreateOptionsLoaded`), feeding the
 * create form's optional checklist picker — the cross-feature pattern the
 * checklists subfeature's `FEATURE.md` documents for this exact consumer.
 *
 * Implements `UnsavedChangesAware` so `unsavedChangesGuard`
 * (`inspections.routes.ts`) can stop navigation while the form holds unsaved
 * work, hosting the shared {@link UnsavedChangesDialog} to resolve its own
 * confirmation.
 *
 * @version 1.3.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-inspection-create-page',
  imports: [RouterLink, InspectionCreateForm, UnsavedChangesDialog, HlmButton, ...HlmCardImports],
  providers: [InspectionCreationOptionsStore, ChecklistStore],
  templateUrl: './inspection-create-page.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InspectionCreatePage implements UnsavedChangesAware {
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

  /** The organization's active checklist templates, loaded on arrival for the create form's optional picker. */
  protected readonly checklistStore: ChecklistStore = inject<ChecklistStore>(ChecklistStore);

  /** Router used to open the new record once it exists. */
  private readonly router: Router = inject(Router);

  /** Whether {@link InspectionCreateForm}'s field tree currently holds unsaved work. */
  protected readonly formDirty: WritableSignal<boolean> = signal<boolean>(false);

  /** The shared "discard your edits?" dialog's open/closed state. */
  protected readonly unsavedChangesDialogState: WritableSignal<BrnDialogState> =
    signal<BrnDialogState>('closed');

  /** Resolves the promise {@link confirmDeactivation} handed to `unsavedChangesGuard`. */
  private confirmDeactivationResolve: ((confirmed: boolean) => void) | null = null;

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
        this.checklistStore.ensureInspectionCreateOptionsLoaded(organizationId);
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

  /**
   * Method hasUnsavedChanges
   * @description `UnsavedChangesAware`: unsaved work is a dirty field tree with no write in flight or already settled.
   * @access public
   * @since 1.2.0
   * @returns {boolean} Whether leaving now would discard work.
   */
  public hasUnsavedChanges(): boolean {
    const status: CallState<InspectionOutput | null>['status'] =
      this.store.createCallState().status;

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
