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
import { HlmAlertDialogImports } from '@shared/ui/alert-dialog';

/**
 * Component OrganizationPlanChangeDialog
 * @class OrganizationPlanChangeDialog
 *
 * @description
 * The confirm gate for the subscription tab's plan switch — an alert dialog
 * modeled on `OrganizationDeleteDialog`, simpler because a plan switch needs
 * no type-to-confirm.
 *
 * Presentational: it emits {@link confirmed} and never calls the store
 * itself (`ARCHITECTURE.md` §10.3). Hosted by `OrganizationPlanSelector`
 * itself — the component `FEATURE.md` documents as owning
 * `OrganizationPlanStore` — rather than by the settings page, matching
 * `DESIGN.md`'s "documented container component" allowance for hosting an
 * overlay that talks to a store.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-organization-plan-change-dialog
 *   [visible]="pendingPlan() !== null"
 *   [planName]="pendingPlan()?.name ?? ''"
 *   [pending]="isChanging()"
 *   (visibleChange)="onDialogVisibleChange($event)"
 *   (confirmed)="confirmChange()"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-plan-change-dialog',
  imports: [...HlmAlertDialogImports],
  templateUrl: './organization-plan-change-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationPlanChangeDialog {
  //#region Inputs
  /**
   * Property visible
   * @readonly
   * @description Whether the dialog is open.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly visible: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property planName
   * @readonly
   * @description The pending plan's display name.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string>}
   */
  public readonly planName: InputSignal<string> = input<string>('');

  /**
   * Property pending
   * @readonly
   * @description Whether the switch is in flight, which locks the confirm action.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Outputs
  /**
   * Property visibleChange
   * @readonly
   * @description Reports the dialog opening or closing, including a dismissal.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<boolean>}
   */
  public readonly visibleChange: OutputEmitterRef<boolean> = output<boolean>();

  /**
   * Property confirmed
   * @readonly
   * @description Emits once the reader activates the confirm action.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<void>}
   */
  public readonly confirmed: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Properties
  /**
   * Property dialogState
   * @readonly
   * @description The overlay's own open/closed state, derived from {@link visible}.
   * @access protected
   * @since 1.0.0
   * @type {Signal<BrnDialogState>}
   */
  protected readonly dialogState: Signal<BrnDialogState> = computed((): BrnDialogState =>
    this.visible() ? 'open' : 'closed',
  );

  /**
   * Property confirmText
   * @readonly
   *
   * @description
   * The confirmation's body, naming the pending plan. Built here rather
   * than interpolated in the template: a named `$localize` placeholder
   * extracts as one translatable sentence, where a template interpolation
   * would extract as a positional `INTERPOLATION` id a translator cannot
   * reorder.
   *
   * @access protected
   * @since 1.0.0
   * @type {Signal<string>}
   */
  protected readonly confirmText: Signal<string> = computed((): string => {
    const planName: string = this.planName();

    return $localize`:@@org.settings.plan.confirmText:The organization will move to ${planName}:planName: immediately. Resource limits and billing update right away.`;
  });
  //#endregion

  //#region Methods
  /**
   * Method onStateChanged
   * @description Reports a dismissal back to the caller.
   * @access protected
   * @since 1.0.0
   * @param {BrnDialogState} state - The overlay's new state.
   * @returns {void}
   */
  protected onStateChanged(state: BrnDialogState): void {
    const isOpen: boolean = state === 'open';

    if (isOpen === this.visible()) return;

    this.visibleChange.emit(isOpen);
  }

  /**
   * Method confirm
   * @description Emits the confirmed plan switch.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected confirm(): void {
    if (this.pending()) return;

    this.confirmed.emit();
  }
  //#endregion
}
