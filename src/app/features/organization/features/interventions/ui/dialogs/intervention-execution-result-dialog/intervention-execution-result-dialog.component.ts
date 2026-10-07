import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import type { BrnDialogState } from '@spartan-ng/brain/dialog';
import type { EquipmentOutput } from '@features/organization/features/equipments/models';
import type {
  InterventionWorkItemExecutionResultInput,
  InterventionWorkItemOutput,
} from '@features/organization/features/interventions/models';
import { HlmDialog, HlmDialogImports } from '@shared/ui/dialog';
import { UnsavedChangesDialog } from '@shared/unsaved-changes';
import { InterventionExecutionResultForm } from '../../forms/intervention-execution-result-form';

/**
 * Component InterventionExecutionResultDialog
 * @class InterventionExecutionResultDialog
 *
 * @description
 * Hosts equipment work results and guards uncommitted operator input on dismissal.
 */
@Component({
  selector: 'app-intervention-execution-result-dialog',
  imports: [...HlmDialogImports, InterventionExecutionResultForm, UnsavedChangesDialog],
  templateUrl: './intervention-execution-result-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionExecutionResultDialog {
  //#region Properties
  /**
   * Property item
   * @readonly
   *
   * @description
   * Captured equipment work item for this dialog lifetime.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<InterventionWorkItemOutput>}
   */
  public readonly item = input.required<InterventionWorkItemOutput>();

  /**
   * Property pending
   * @readonly
   *
   * @description
   * Prevents dismissal during accepted persistence.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly pending = input(false);

  /**
   * Property disabled
   * @readonly
   *
   * @description
   * Server capabilities no longer allow committing this preserved result draft.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly disabled = input(false);

  /**
   * Property serverError
   * @readonly
   *
   * @description
   * Result write failure kept beside the preserved form.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<unknown>}
   */
  public readonly serverError = input<unknown>(null);

  /**
   * Property replacementSuccessor
   * @readonly
   *
   * @description
   * Confirmed published successor of the task's original equipment.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<EquipmentOutput | null>}
   */
  public readonly replacementSuccessor = input<EquipmentOutput | null>(null);

  /**
   * Property replacementLoading
   * @readonly
   *
   * @description
   * Current proof read is still pending.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly replacementLoading = input(false);

  /**
   * Property replacementReadFailed
   * @readonly
   *
   * @description
   * Current scope could not retrieve replacement proof.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly replacementReadFailed = input(false);

  /**
   * Property originalEquipmentLink
   * @readonly
   *
   * @description
   * Equipment dossier route keeps the current work draft open in this tab.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<readonly string[] | null>}
   */
  public readonly originalEquipmentLink = input<readonly string[] | null>(null);

  /**
   * Property refreshReplacement
   * @readonly
   *
   * @description
   * Refreshes the linked successor without clearing the form.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly refreshReplacement = output<void>();

  /**
   * Property submitted
   * @readonly
   *
   * @description
   * Validated result forwarded to the owning page.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<InterventionWorkItemExecutionResultInput>}
   */
  public readonly submitted = output<InterventionWorkItemExecutionResultInput>();

  /**
   * Property dismissed
   * @readonly
   *
   * @description
   * Operator approved discarding any uncommitted input.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly dismissed = output<void>();

  /**
   * Property dirty
   * @readonly
   *
   * @description
   * Form-owned dirtiness guards accidental closure.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly dirty = signal(false);

  /**
   * Property discardState
   * @readonly
   *
   * @description
   * Explicit discard confirmation state.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<BrnDialogState>}
   */
  protected readonly discardState = signal<BrnDialogState>('closed');

  /**
   * Property dialog
   * @readonly
   *
   * @description
   * Restores the native panel when a dirty draft intercepted its closure.
   *
   * @access private
   * @since unreleased
   *
   * @type {Signal<HlmDialog | undefined>}
   */
  private readonly dialog = viewChild(HlmDialog);
  //#endregion

  //#region Methods
  /**
   * Method requestClose
   * @method requestClose
   *
   * @description
   * Confirms discard rather than losing actual work details.
   *
   * @access protected
   * @since unreleased
   *
   * @returns {void}
   */
  protected requestClose(): void {
    if (this.pending()) return;
    if (this.dirty()) {
      this.dialog()?.open();
      this.discardState.set('open');
    } else this.dismissed.emit();
  }
  //#endregion
}
