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
import type { OrganizationMemberOutput } from '@features/organization/models';
import { HlmAlertDialogImports } from '@shared/ui/alert-dialog';

/**
 * Component OrganizationMemberRemoveDialog
 * @class OrganizationMemberRemoveDialog
 *
 * @description
 * The confirm gate for removing a member from the roster, single or bulk —
 * an alert dialog modeled on `OrganizationDeleteDialog`, simpler because a
 * member removal needs no type-to-confirm. {@link member} names a single
 * row's target; {@link bulkCount} carries the toolbar's multi-row count.
 * Exactly one is meaningful at a time — the caller sets the other to `null`.
 *
 * Presentational: it emits {@link confirmed} and never calls the store
 * itself (`ARCHITECTURE.md` §10.3).
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-organization-member-remove-dialog
 *   [visible]="removeDialogState() === 'open'"
 *   [member]="pendingRemove()"
 *   [bulkCount]="pendingBulkRemoveIds()?.length ?? null"
 *   [pending]="removeDialogBusy()"
 *   [error]="removeDialogError()?.message ?? null"
 *   (visibleChange)="onRemoveDialogVisibleChange($event)"
 *   (confirmed)="confirmRemove()"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-member-remove-dialog',
  imports: [...HlmAlertDialogImports],
  templateUrl: './organization-member-remove-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationMemberRemoveDialog {
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
   * Property member
   * @readonly
   * @description The single row's target, or `null` when this confirm is a bulk removal.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<OrganizationMemberOutput | null>}
   */
  public readonly member: InputSignal<OrganizationMemberOutput | null> =
    input<OrganizationMemberOutput | null>(null);

  /**
   * Property bulkCount
   * @readonly
   * @description How many members the toolbar's selection targets, or `null` when this confirm is a single row.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<number | null>}
   */
  public readonly bulkCount: InputSignal<number | null> = input<number | null>(null);

  /**
   * Property pending
   * @readonly
   * @description Whether the removal is in flight, which locks the confirm action and blocks dismissal.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property error
   * @readonly
   * @description The store's removal failure message, or `null`.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string | null>}
   */
  public readonly error: InputSignal<string | null> = input<string | null>(null);
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
   * Property title
   * @readonly
   * @description The confirmation's heading, naming the count for a bulk removal.
   * @access protected
   * @since 1.0.0
   * @type {Signal<string>}
   */
  protected readonly title: Signal<string> = computed((): string => {
    const bulkCount: number | null = this.bulkCount();

    if (bulkCount !== null && bulkCount > 1) {
      return $localize`:@@org.members.removeConfirmTitleMany:Remove ${bulkCount}:count: members?`;
    }

    return $localize`:@@org.members.removeConfirmTitleOne:Remove member?`;
  });

  /**
   * Property description
   * @readonly
   * @description The confirmation's body: names the member for a single row, counts them for a bulk selection.
   * @access protected
   * @since 1.0.0
   * @type {Signal<string>}
   */
  protected readonly description: Signal<string> = computed((): string => {
    const bulkCount: number | null = this.bulkCount();

    if (bulkCount !== null) {
      return bulkCount > 1
        ? $localize`:@@org.members.removeConfirmDescriptionMany:This will remove ${bulkCount}:count: members from the organization. This action cannot be undone.`
        : $localize`:@@org.members.removeConfirmDescriptionOne:This will remove this member from the organization. This action cannot be undone.`;
    }

    const single: OrganizationMemberOutput | null = this.member();

    return single
      ? $localize`:@@org.members.removeConfirmDescriptionSingle:This will remove "${single.email ?? single.displayName ?? single.id}:name:" from the organization. This action cannot be undone.`
      : '';
  });
  //#endregion

  //#region Methods
  /**
   * Method onStateChanged
   * @description Reports a dismissal back to the page.
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
   * @description Emits the confirmed removal.
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
