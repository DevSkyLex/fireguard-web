import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
  untracked,
  viewChild,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import type { BrnDialogState } from '@spartan-ng/brain/dialog';
import type {
  CreateOrganizationRoleInput,
  OrganizationPermissionOutput,
} from '@features/organization/models';
import { sheetSide } from '@shared/sheet-side';
import { HlmSheet, HlmSheetImports } from '@shared/ui/sheet';
import { UnsavedChangesDialog } from '@shared/unsaved-changes';
import { OrganizationRoleCreateForm } from '../../forms/organization-role-create-form';

/**
 * Component OrganizationRoleCreateSheet
 * @class OrganizationRoleCreateSheet
 *
 * @description
 * The spartan sheet hosting {@link OrganizationRoleCreateForm}, mirroring
 * how the feature's other create flows host their form inside a panel
 * (`intervention-create-sheet`): a record the operator will open next is
 * created in a sheet, whatever its size (`DESIGN.md` "Action Surfaces").
 *
 * Purely presentational: it owns the overlay and forwards
 * `visible`/`visibleChange`, re-emitting the form's `submitted`; the page
 * keeps the orchestration (`ARCHITECTURE.md` §10.5). Its open state is
 * derived from `visible` rather than held locally, so the page stays the
 * single owner and the two cannot drift. An Escape or outside-click on a
 * dirty draft is undone and turned into the shared unsaved-changes
 * confirmation, exactly as `facility-create-sheet` does.
 *
 * @version 1.1.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-role-create-sheet',
  imports: [OrganizationRoleCreateForm, UnsavedChangesDialog, ...HlmSheetImports],
  templateUrl: './organization-role-create-sheet.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationRoleCreateSheet {
  //#region Inputs
  /**
   * Property visible
   * @readonly
   * @description Whether the panel is open. Owned by the page.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly visible: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property pending
   * @readonly
   * @description Whether the creation request is in flight.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property serverError
   * @readonly
   * @description Whatever the creation failed with, forwarded to the form.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<unknown>}
   */
  public readonly serverError: InputSignal<unknown> = input<unknown>(null);

  /**
   * Property catalog
   * @readonly
   * @description The organization's assignable permissions, forwarded to the form's checklist.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly OrganizationPermissionOutput[]>}
   */
  public readonly catalog: InputSignal<readonly OrganizationPermissionOutput[]> = input<
    readonly OrganizationPermissionOutput[]
  >([]);
  //#endregion

  //#region Outputs
  /**
   * Property visibleChange
   * @readonly
   * @description The panel wants to open or close.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<boolean>}
   */
  public readonly visibleChange: OutputEmitterRef<boolean> = output<boolean>();

  /**
   * Property submitted
   * @readonly
   * @description The form's validated role, forwarded untouched.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<CreateOrganizationRoleInput>}
   */
  public readonly submitted: OutputEmitterRef<CreateOrganizationRoleInput> =
    output<CreateOrganizationRoleInput>();
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   * @description Clears {@link dirty} whenever the panel closes, so an abandoned draft cannot make the next opening confirm over nothing.
   * @access public
   * @since 1.1.0
   */
  public constructor() {
    effect((): void => {
      const isVisible: boolean = this.visible();

      untracked((): void => {
        if (!isVisible) this.dirty.set(false);
      });
    });
  }
  //#endregion

  //#region Properties
  /**
   * Property sheetState
   * @readonly
   * @description The overlay state, derived from {@link visible} so there is no second copy of the truth.
   * @access protected
   * @since 1.0.0
   * @type {Signal<BrnDialogState>}
   */
  protected readonly sheetState: Signal<BrnDialogState> = computed<BrnDialogState>(() =>
    this.visible() ? 'open' : 'closed',
  );

  /**
   * Property side
   * @readonly
   * @description The panel's side — `'bottom'` below `sm`, `'right'` at and above it (`DESIGN.md` "Action Surfaces" rule 2).
   * @access protected
   * @since 2.0.0
   * @type {Signal<'right' | 'bottom'>}
   */
  protected readonly side: Signal<'right' | 'bottom'> = sheetSide();

  /**
   * Property dirty
   * @readonly
   * @description Whether closing right now would lose something — set from the form's `dirtyChanged`. Gates {@link requestClose}.
   * @access protected
   * @since 1.1.0
   * @type {WritableSignal<boolean>}
   */
  protected readonly dirty: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property unsavedChangesDialogState
   * @readonly
   * @description Open state of the shared {@link UnsavedChangesDialog}, raised by {@link requestClose} when {@link dirty} is true.
   * @access protected
   * @since 1.1.0
   * @type {WritableSignal<BrnDialogState>}
   */
  protected readonly unsavedChangesDialogState: WritableSignal<BrnDialogState> =
    signal<BrnDialogState>('closed');

  /**
   * Property sheetRef
   * @readonly
   * @description The panel directive, queried so {@link onStateChanged} can reopen it to undo an Escape/outside-click made while {@link dirty}.
   * @access protected
   * @since 1.1.0
   * @type {Signal<HlmSheet | undefined>}
   */
  protected readonly sheetRef: Signal<HlmSheet | undefined> = viewChild(HlmSheet);
  //#endregion

  //#region Methods
  /**
   * Method onStateChanged
   * @method onStateChanged
   *
   * @description
   * Relays a dismissal — escape, the backdrop, the close button — ignoring
   * the echo of a change the page already made; a dismissal reaching here
   * while {@link dirty} is undone and redirected to the confirmation.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {BrnDialogState} state - The overlay's new state.
   *
   * @returns {void}
   */
  protected onStateChanged(state: BrnDialogState): void {
    const isOpen: boolean = state === 'open';

    if (isOpen === this.visible()) return;

    if (!isOpen && this.dirty()) {
      this.sheetRef()?.open();
      this.unsavedChangesDialogState.set('open');

      return;
    }

    this.visibleChange.emit(isOpen);
  }

  /**
   * Method requestClose
   * @description The panel's own close action, reached from the form's Cancel. Closes right away when nothing would be lost; otherwise asks first.
   * @access protected
   * @since 1.1.0
   * @returns {void}
   */
  protected requestClose(): void {
    if (this.dirty()) {
      this.unsavedChangesDialogState.set('open');

      return;
    }

    this.visibleChange.emit(false);
  }

  /**
   * Method onUnsavedChangesConfirmed
   * @description The operator chose to discard the draft — closes both the confirmation and the panel.
   * @access protected
   * @since 1.1.0
   * @returns {void}
   */
  protected onUnsavedChangesConfirmed(): void {
    this.unsavedChangesDialogState.set('closed');
    this.visibleChange.emit(false);
  }

  /**
   * Method onUnsavedChangesDismissed
   * @description The operator chose to keep editing — closes the confirmation only.
   * @access protected
   * @since 1.1.0
   * @returns {void}
   */
  protected onUnsavedChangesDismissed(): void {
    this.unsavedChangesDialogState.set('closed');
  }
  //#endregion
}
