import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
  untracked,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import type { BrnDialogState } from '@spartan-ng/brain/dialog';
import type { MaintenanceScheduleOutput } from '@features/organization/features/maintenance-schedules/models';
import { MAINTENANCE_OVERRIDE_DURATION_OPTIONS } from '@features/organization/features/maintenance-schedules/options';
import { HlmButton } from '@shared/ui/button';
import { HlmDialogImports } from '@shared/ui/dialog';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmSelectImports } from '@shared/ui/select';

/** The select's value for "clear the override and follow the organization default". */
const ORGANIZATION_DEFAULT_VALUE: string = '__organization_default__';

/**
 * Component MaintenanceOverrideDialog
 * @class MaintenanceOverrideDialog
 *
 * @description
 * The spartan dialog setting or clearing one schedule's interval override —
 * a bounded duration select plus an explicit "Use organization default"
 * choice that sends `null`. The choice list already constrains every value
 * to `[P28D, P10Y]`, so there is nothing left to validate; unlike the
 * feature's other dialogs this one holds its draft as a plain signal rather
 * than a Signal Forms field tree.
 *
 * Owns the overlay and its draft only; the page keeps the store call and the
 * navigation/toast reaction (`ARCHITECTURE.md` §10.5). Its open state is
 * derived from `visible` rather than held locally, so the page stays the
 * single owner and the two cannot drift.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-maintenance-override-dialog',
  imports: [HlmButton, ...HlmDialogImports, ...HlmFieldImports, ...HlmSelectImports],
  templateUrl: './maintenance-override-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MaintenanceOverrideDialog {
  //#region Inputs
  /**
   * Property visible
   * @readonly
   * @description Whether the dialog is open. Owned by the page.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly visible: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property pending
   * @readonly
   * @description Whether the override request is in flight.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property schedule
   * @readonly
   * @description The schedule being edited, seeding the draft's current override.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<MaintenanceScheduleOutput | null>}
   */
  public readonly schedule: InputSignal<MaintenanceScheduleOutput | null> =
    input<MaintenanceScheduleOutput | null>(null);
  //#endregion

  //#region Outputs
  /**
   * Property visibleChange
   * @readonly
   * @description The dialog wants to open or close.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<boolean>}
   */
  public readonly visibleChange: OutputEmitterRef<boolean> = output<boolean>();

  /**
   * Property submitted
   * @readonly
   * @description The chosen override — an ISO-8601 duration, or `null` for the organization default.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<string | null>}
   */
  public readonly submitted: OutputEmitterRef<string | null> = output<string | null>();
  //#endregion

  //#region Properties
  /** The duration choices offered, plus the sentinel "organization default" entry. */
  protected readonly durationOptions: typeof MAINTENANCE_OVERRIDE_DURATION_OPTIONS =
    MAINTENANCE_OVERRIDE_DURATION_OPTIONS;

  /** The sentinel value representing "clear the override". */
  protected readonly organizationDefaultValue: string = ORGANIZATION_DEFAULT_VALUE;

  /** The select's current draft — a duration value, or the sentinel. */
  protected readonly draft: WritableSignal<string> = signal<string>(ORGANIZATION_DEFAULT_VALUE);

  /**
   * Property dialogState
   * @readonly
   * @description The overlay state, derived from {@link visible} so there is no second copy of the truth.
   * @access protected
   * @since 1.0.0
   * @type {Signal<BrnDialogState>}
   */
  protected readonly dialogState: Signal<BrnDialogState> = computed<BrnDialogState>(() =>
    this.visible() ? 'open' : 'closed',
  );
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Reseeds {@link draft} from {@link schedule} whenever the dialog opens for
   * a different (or the same) row, so a previous edit never leaks into the
   * next row opened.
   *
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    effect((): void => {
      const isVisible: boolean = this.visible();
      const current: MaintenanceScheduleOutput | null = this.schedule();

      untracked((): void => {
        if (isVisible) this.draft.set(current?.intervalOverride ?? ORGANIZATION_DEFAULT_VALUE);
      });
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method durationLabelOf
   * @description Names a duration value on the closed select trigger, including the sentinel "organization default" entry.
   * @access protected
   * @since 1.0.0
   * @param {string} value - The select's current value.
   * @returns {string} The localized label.
   */
  protected durationLabelOf = (value: string): string => {
    if (value === ORGANIZATION_DEFAULT_VALUE) {
      return $localize`:@@maintenance.overrideDialog.useDefault:Use organization default`;
    }

    return (
      this.durationOptions.find((option) => option.value === value)?.label ??
      $localize`:@@common.unknownValue:Unknown value`
    );
  };

  /**
   * Method onStateChanged
   * @method onStateChanged
   *
   * @description
   * Relays a dismissal — escape, the backdrop, the close button — ignoring
   * the echo of a change the page already made.
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

    this.visibleChange.emit(isOpen);
  }

  /**
   * Method submit
   * @description Emits the chosen override, translating the sentinel back to `null`.
   * @access protected
   * @since 1.0.0
   * @param {Event} event - The submit event.
   * @returns {void}
   */
  protected submit(event: Event): void {
    event.preventDefault();

    const value: string = this.draft();

    this.submitted.emit(value === ORGANIZATION_DEFAULT_VALUE ? null : value);
  }
  //#endregion
}
