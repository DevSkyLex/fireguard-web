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
import type {
  InterventionOutput,
  MemberSelectOption,
  SelectOption,
} from '@features/organization/features/interventions/models';
import {
  InterventionPlanningForm,
  type InterventionPlanningFormValues,
} from '@features/organization/features/interventions/ui/forms';

/**
 * Component InterventionEditDrawer
 * @class InterventionEditDrawer
 *
 * @description
 * Presentational right-side drawer hosting the {@link InterventionPlanningForm}
 * used to edit an intervention's planning details (site, responsible,
 * participants, priority, schedule). Owns only the drawer shell and forwards
 * visibility, loading state, the intervention and selector options through
 * inputs while emitting the validated values and visibility changes through
 * outputs. All orchestration (submission, persistence) stays with the parent.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-edit-drawer',
  imports: [DrawerModule, InterventionPlanningForm],
  templateUrl: './intervention-edit-drawer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'onEscape($event)',
  },
})
export class InterventionEditDrawer {
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
   * Input intervention
   * @readonly
   *
   * @description
   * Intervention whose planning details are being edited.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<InterventionOutput>}
   */
  public readonly intervention: InputSignal<InterventionOutput> =
    input.required<InterventionOutput>();

  /**
   * Input loading
   * @readonly
   *
   * @description
   * Whether a save request is in flight; locks the form and the drawer.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly loading: InputSignal<boolean> = input<boolean>(false);

  /**
   * Input disabled
   * @readonly
   *
   * @description
   * Whether the form is disabled (e.g. the user lacks planning permission).
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly disabled: InputSignal<boolean> = input<boolean>(false);

  /**
   * Input siteOptions
   * @readonly
   *
   * @description
   * Available intervention site options for the site selector.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly SelectOption[]>}
   */
  public readonly siteOptions: InputSignal<readonly SelectOption[]> = input<
    readonly SelectOption[]
  >([]);

  /**
   * Input memberOptions
   * @readonly
   *
   * @description
   * Available organization member options for the responsible and participants
   * selectors.
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
   * Emits the validated planning values when the hosted form is submitted.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<InterventionPlanningFormValues>}
   */
  public readonly submitted: OutputEmitterRef<InterventionPlanningFormValues> =
    output<InterventionPlanningFormValues>();
  //#endregion

  //#region Properties
  /**
   * Property drawerPt
   * @readonly
   *
   * @description
   * PrimeNG drawer pass-through options sizing the panel responsively: full
   * width on mobile, widening on larger viewports to give the two-column
   * planning form room.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {DrawerPassThroughOptions}
   */
  protected readonly drawerPt: DrawerPassThroughOptions = {
    root: { class: '!w-full md:!w-[52rem] xl:!w-[60rem]' },
  };
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
   * @type {Signal<InterventionPlanningForm | undefined>}
   */
  private readonly formRef: Signal<InterventionPlanningForm | undefined> =
    viewChild(InterventionPlanningForm);

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
