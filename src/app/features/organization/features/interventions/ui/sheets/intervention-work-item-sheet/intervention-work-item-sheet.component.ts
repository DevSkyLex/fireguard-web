import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
} from '@angular/core';
import type { BrnDialogState } from '@spartan-ng/brain/dialog';
import type {
  MemberSelectOption,
  SelectOption,
} from '@features/organization/features/interventions/models';
import { sheetSide } from '@shared/sheet-side';
import { HlmSheetImports } from '@shared/ui/sheet';
import {
  InterventionWorkItemForm,
  type InterventionWorkItemFormValues,
} from '../../forms/intervention-work-item-form';

/**
 * Component InterventionWorkItemSheet
 * @class InterventionWorkItemSheet
 *
 * @description
 * The spartan sheet hosting {@link InterventionWorkItemForm}.
 *
 * Purely presentational: it owns the panel, forwards `visible`/`visibleChange`
 * and re-emits the form's `submitted`; the page keeps the orchestration
 * (`ARCHITECTURE.md` §10.5). Its open state is derived from `visible` rather
 * than held locally, so the page stays the single owner and the two cannot
 * drift.
 *
 * Below `sm` the panel presents as a bottom drawer (`@shared/sheet-side`)
 * instead of a right-hand panel, so its footer lands in the thumb zone.
 *
 * @version 1.1.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-work-item-sheet',
  imports: [InterventionWorkItemForm, ...HlmSheetImports],
  templateUrl: './intervention-work-item-sheet.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionWorkItemSheet {
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
   * Property disabled
   * @readonly
   * @description Whether the scope may still grow, forwarded to the form.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly disabled: InputSignal<boolean> = input<boolean>(false);

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
   * Property targetOptions
   * @readonly
   * @description The facilities and equipment an item can point at.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly SelectOption[]>}
   */
  public readonly targetOptions: InputSignal<readonly SelectOption[]> = input<
    readonly SelectOption[]
  >([]);

  /**
   * Property memberOptions
   * @readonly
   * @description The members an item can be assigned to.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly MemberSelectOption[]>}
   */
  public readonly memberOptions: InputSignal<readonly MemberSelectOption[]> = input<
    readonly MemberSelectOption[]
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
   * @description The form's validated item, forwarded untouched.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<InterventionWorkItemFormValues>}
   */
  public readonly submitted: OutputEmitterRef<InterventionWorkItemFormValues> =
    output<InterventionWorkItemFormValues>();
  //#endregion

  //#region Properties
  /**
   * Property sheetState
   * @readonly
   * @description The panel state, derived from {@link visible} so there is no second copy of the truth.
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
   * @since 1.1.0
   * @type {Signal<'right' | 'bottom'>}
   */
  protected readonly side: Signal<'right' | 'bottom'> = sheetSide();
  //#endregion

  //#region Methods
  /**
   * Method onStateChanged
   * @method onStateChanged
   *
   * @description
   * Relays a dismissal, ignoring the echo of a change the page already made.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {BrnDialogState} state - The panel's new state.
   *
   * @returns {void}
   */
  protected onStateChanged(state: BrnDialogState): void {
    const isOpen: boolean = state === 'open';

    if (isOpen === this.visible()) return;

    this.visibleChange.emit(isOpen);
  }
  //#endregion
}
