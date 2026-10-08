import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
  viewChild,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import type { BrnDialogState } from '@spartan-ng/brain/dialog';
import type {
  CustomerInput,
  CustomerOutput,
} from '@features/organization/features/customers/models';
import { sheetSide } from '@shared/sheet-side';
import { HlmButton } from '@shared/ui/button';
import { HlmSheet, HlmSheetImports } from '@shared/ui/sheet';
import { UnsavedChangesDialog } from '@shared/unsaved-changes';
import { CustomerForm } from '../../forms/customer-form/customer-form.component';

/**
 * Class CustomerEditorSheet
 * @class CustomerEditorSheet
 *
 * @description
 * Customer editor retains failed drafts and confirms dismissal of unsaved edits.
 *
 * @since unreleased
 */
@Component({
  selector: 'app-customer-editor-sheet',
  templateUrl: './customer-editor-sheet.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HlmButton, CustomerForm, UnsavedChangesDialog, ...HlmSheetImports],
})
export class CustomerEditorSheet {
  //#region Properties
  /**
   * Property conflict
   * @readonly
   *
   * @description
   * Whether a stale revision can be explicitly refreshed without discarding edits.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly conflict: InputSignal<boolean> = input(false);
  /**
   * Property refreshRequested
   * @readonly
   *
   * @description
   * Refreshes the latest server revision while preserving the local draft.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly refreshRequested: OutputEmitterRef<void> = output<void>();
  /**
   * Property sheetRef
   * @readonly
   *
   * @description
   * Native sheet reopened when dismissal would abandon a dirty draft.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<HlmSheet | undefined>}
   */
  protected readonly sheetRef: Signal<HlmSheet | undefined> = viewChild(HlmSheet);

  /**
   * Property visible
   * @readonly
   *
   * @description
   * Hosting page owns visibility.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly visible: InputSignal<boolean> = input(false);
  /**
   * Property customer
   * @readonly
   *
   * @description
   * Existing record or creation.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<CustomerOutput | null>}
   */
  public readonly customer: InputSignal<CustomerOutput | null> = input<CustomerOutput | null>(null);
  /**
   * Property pending
   * @readonly
   *
   * @description
   * Accepted command locks dismissal and editing.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input(false);
  /**
   * Property error
   * @readonly
   *
   * @description
   * Server rejection without draft reset.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string | null>}
   */
  public readonly error: InputSignal<string | null> = input<string | null>(null);
  /**
   * Property dismissed
   * @readonly
   *
   * @description
   * Confirmed editor dismissal.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly dismissed: OutputEmitterRef<void> = output<void>();
  /**
   * Property submitted
   * @readonly
   *
   * @description
   * Validated input forwarded to the page.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<CustomerInput>}
   */
  public readonly submitted: OutputEmitterRef<CustomerInput> = output<CustomerInput>();
  /**
   * Property dirty
   * @readonly
   *
   * @description
   * Actual form dirty state.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly dirty: WritableSignal<boolean> = signal(false);
  /**
   * Property confirmation
   * @readonly
   *
   * @description
   * Unsaved changes confirmation.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<BrnDialogState>}
   */
  protected readonly confirmation: WritableSignal<BrnDialogState> =
    signal<BrnDialogState>('closed');
  /**
   * Property state
   * @readonly
   *
   * @description
   * Native sheet state follows the single owner.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<BrnDialogState>}
   */
  protected readonly state: Signal<BrnDialogState> = computed(() =>
    this.visible() ? 'open' : 'closed',
  );
  /**
   * Property side
   * @readonly
   *
   * @description
   * Responsive sheet placement.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<'right' | 'bottom'>}
   */
  protected readonly side: Signal<'right' | 'bottom'> = sheetSide();
  /**
   * Property title
   * @readonly
   *
   * @description
   * Current workflow title.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<string>}
   */
  protected readonly title: Signal<string> = computed(() =>
    this.customer()
      ? $localize`:@@customer.editor.edit:Edit customer`
      : $localize`:@@customer.editor.create:New customer`,
  );
  //#endregion

  //#region Methods
  /**
   * Method requestClose
   * @method
   *
   * @description
   * Preserves drafts when a native dismissal is requested.
   *
   * @access protected
   * @since unreleased
   *
   * @returns {void} No return value.
   */
  protected requestClose(): void {
    if (this.pending()) return;
    if (this.dirty()) this.confirmation.set('open');
    else this.dismissed.emit();
  }
  /**
   * Method stateChanged
   * @method
   *
   * @description
   * Relays native closure through the same dirty-state policy.
   *
   * @access protected
   * @since unreleased
   *
   * @param {BrnDialogState} state - Value supplied by the owning customer workflow.
   *
   * @returns {void} No return value.
   */
  protected stateChanged(state: BrnDialogState): void {
    if (state === 'closed' && this.visible()) {
      if (this.dirty()) this.sheetRef()?.open();
      this.requestClose();
    }
  }
  /**
   * Method discard
   * @method
   *
   * @description
   * Discards only after the user's explicit dismissal choice.
   *
   * @access protected
   * @since unreleased
   *
   * @returns {void} No return value.
   */
  protected discard(): void {
    this.confirmation.set('closed');
    this.dirty.set(false);
    this.dismissed.emit();
  }
  //#endregion
}
