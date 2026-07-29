import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  viewChild,
} from '@angular/core';
import type { InputSignal, OutputEmitterRef, Signal } from '@angular/core';
import { DrawerModule, type DrawerPassThroughOptions } from 'primeng/drawer';
import { INTERVENTION_DRAWER_PT } from '@features/organization/features/interventions/constants';
import type {
  MemberSelectOption,
  SelectOption,
} from '@features/organization/features/interventions/models';
import {
  InterventionWorkItemForm,
  type InterventionWorkItemFormValues,
} from '@features/organization/features/interventions/ui/forms';

/**
 * Component InterventionWorkItemDrawer
 * @class InterventionWorkItemDrawer
 *
 * @description
 * Presentational right-side drawer hosting the {@link InterventionWorkItemForm}
 * used to add a planned work item to the prepared scope. Owns only the drawer
 * shell and forwards visibility, loading state and selector options through
 * inputs while emitting the validated values and visibility changes through
 * outputs. All orchestration (submission, persistence) stays with the parent.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-work-item-drawer',
  imports: [DrawerModule, InterventionWorkItemForm],
  templateUrl: './intervention-work-item-drawer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'onEscape($event)',
  },
})
export class InterventionWorkItemDrawer {
  //#region Inputs
  /**
   * Input visible
   * @readonly
   *
   * @description
   * Whether the drawer is currently open.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly visible: InputSignal<boolean> = input<boolean>(false);

  /**
   * Input loading
   * @readonly
   *
   * @description
   * Whether a creation request is in flight; locks the form and the drawer.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly loading: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property serverError
   * @readonly
   *
   * @description
   * Last submission failure, forwarded to the form so a 422 lands on the field the
   * server named. The drawer only relays it; it owns no error handling.
   *
   * @access public
   * @since 1.1.0
   *
   * @type {InputSignal<unknown>}
   */
  public readonly serverError: InputSignal<unknown> = input<unknown>(null);

  /**
   * Input disabled
   * @readonly
   *
   * @description
   * Whether the form is disabled (e.g. the intervention can no longer accept
   * planned work items).
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly disabled: InputSignal<boolean> = input<boolean>(false);

  /**
   * Input targetOptions
   * @readonly
   *
   * @description
   * Available target options (facilities and equipment) for the target selector.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly SelectOption[]>}
   */
  public readonly targetOptions: InputSignal<readonly SelectOption[]> = input<
    readonly SelectOption[]
  >([]);

  /**
   * Input memberOptions
   * @readonly
   *
   * @description
   * Available organization member options for the assignee selector.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly MemberSelectOption[]>}
   */
  public readonly memberOptions: InputSignal<readonly MemberSelectOption[]> = input<
    readonly MemberSelectOption[]
  >([]);
  //#endregion

  //#region Outputs
  /**
   * Output visibleChange
   * @readonly
   *
   * @description
   * Emits the new visibility state when the drawer is opened or dismissed.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<boolean>}
   */
  public readonly visibleChange: OutputEmitterRef<boolean> = output<boolean>();

  /**
   * Output submitted
   * @readonly
   *
   * @description
   * Emits the validated work item values when the hosted form is submitted.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<InterventionWorkItemFormValues>}
   */
  public readonly submitted: OutputEmitterRef<InterventionWorkItemFormValues> =
    output<InterventionWorkItemFormValues>();
  //#endregion

  //#region Properties
  /**
   * Property drawerPt
   * @readonly
   *
   * @description
   * PrimeNG drawer pass-through options sizing the panel responsively: full
   * width on mobile, compact on larger viewports.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {DrawerPassThroughOptions}
   */
  protected readonly drawerPt: DrawerPassThroughOptions = INTERVENTION_DRAWER_PT;
  //#endregion

  //#region Dismissal guard
  /**
   * Property formRef
   * @readonly
   *
   * @description
   * Composed form component, observed for unsaved edits.
   *
   * @access private
   * @since 1.1.0
   *
   * @type {Signal<InterventionWorkItemForm | undefined>}
   */
  private readonly formRef: Signal<InterventionWorkItemForm | undefined> =
    viewChild(InterventionWorkItemForm);

  /**
   * Property canDismiss
   * @readonly
   *
   * @description
   * Whether accidental dismissal (Esc, backdrop tap) may close the drawer:
   * blocked while a request is in flight or the form holds unsaved edits, so
   * a mis-tap never silently discards field input.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canDismiss: Signal<boolean> = computed<boolean>(
    () => !this.loading() && !(this.formRef()?.dirty() ?? false),
  );

  /**
   * Method onEscape
   * @method onEscape
   *
   * @description
   * Dirty-aware Escape handling (PrimeNG's own escape listener is bound at
   * open time and closes unconditionally, so it stays disabled): closes the
   * drawer only while {@link canDismiss} holds.
   *
   * @access protected
   * @since 1.1.0
   *
   * @param {Event} event - Document-level Escape keydown.
   *
   * @return {void}
   */
  protected onEscape(event: Event): void {
    if (event.defaultPrevented || !this.visible()) return;
    if (!this.canDismiss()) return;
    this.visibleChange.emit(false);
  }
  //#endregion
}
