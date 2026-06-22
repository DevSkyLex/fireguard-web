import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { InputSignal, OutputEmitterRef } from '@angular/core';
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
  protected readonly drawerPt: DrawerPassThroughOptions = {
    root: { class: '!w-full md:!w-[52rem] xl:!w-[60rem]' },
  };
  //#endregion
}
