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
  MemberSelectOption,
  SelectOption,
} from '@features/organization/features/interventions/models';
import {
  InterventionCreateForm,
  type InterventionCreateFormValues,
} from '@features/organization/features/interventions/ui/forms';

/**
 * Component InterventionCreateDrawer
 * @class InterventionCreateDrawer
 *
 * @description
 * Presentational right-side drawer hosting the guided {@link InterventionCreateForm}.
 * Owns only the drawer shell and forwards visibility, loading state and selector
 * options through inputs while emitting the validated draft values and visibility
 * changes through outputs. All orchestration (options loading, submission,
 * navigation) stays with the parent page.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-create-drawer',
  imports: [DrawerModule, InterventionCreateForm],
  templateUrl: './intervention-create-drawer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'onEscape($event)',
  },
})
export class InterventionCreateDrawer {
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
   * Input optionsLoading
   * @readonly
   *
   * @description
   * Whether site and member selector options are still loading.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly optionsLoading: InputSignal<boolean> = input<boolean>(false);

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
   * Available organization member options for the participants and responsible
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

  /**
   * Input initialPlannedStartAt
   * @readonly
   *
   * @description
   * Optional planned start date forwarded to the hosted form so opening the
   * drawer from a calendar day pre-fills that day's schedule.
   *
   * @access public
   * @since 1.1.0
   *
   * @type {InputSignal<Date | null>}
   */
  public readonly initialPlannedStartAt: InputSignal<Date | null> = input<Date | null>(null);
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
   * Emits the validated draft values when the hosted form is submitted.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<InterventionCreateFormValues>}
   */
  public readonly submitted: OutputEmitterRef<InterventionCreateFormValues> =
    output<InterventionCreateFormValues>();
  //#endregion

  //#region Properties
  /**
   * Property drawerPt
   * @readonly
   *
   * @description
   * PrimeNG drawer pass-through options sizing the panel responsively: full
   * width on mobile, widening on larger viewports to give the guided form room.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {DrawerPassThroughOptions}
   */
  /*
   * The `md` step must fit inside the breakpoint that triggers it: `md` is
   * 48rem = 768px (a media query, so it does not track the root font size),
   * while `52rem` does — it was 728px under the old 14px root and would now be
   * 832px, i.e. wider than the viewport it opens at. `!max-w-[100vw]` keeps
   * that class of mistake from reaching the user again.
   */
  protected readonly drawerPt: DrawerPassThroughOptions = {
    root: { class: '!w-full !max-w-[100vw] md:!w-[45rem] xl:!w-[60rem]' },
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
   * @type {Signal<InterventionCreateForm | undefined>}
   */
  private readonly formRef: Signal<InterventionCreateForm | undefined> =
    viewChild(InterventionCreateForm);

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
