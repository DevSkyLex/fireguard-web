import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  signal,
  viewChild,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import type {
  InterventionWorkItemOutput,
  UpdateInterventionWorkItemInput,
  MemberSelectOption,
} from '@features/organization/features/interventions/models';
import { sheetSide } from '@shared/sheet-side';
import { HlmAlertImports } from '@shared/ui/alert';
import { HlmButton } from '@shared/ui/button';
import { HlmSheet, HlmSheetImports } from '@shared/ui/sheet';
import { UnsavedChangesDialog } from '@shared/unsaved-changes';
import { InterventionEffortForm } from '../../forms/intervention-effort-form';

/**
 * Component InterventionEffortSheet
 * @class InterventionEffortSheet
 *
 * @description
 * Protects an explicit effort or planning edit while preserving the intervention as context.
 *
 * @version 1.0.0
 */
@Component({
  selector: 'app-intervention-effort-sheet',
  templateUrl: './intervention-effort-sheet.component.html',
  imports: [
    HlmSheetImports,
    HlmAlertImports,
    HlmButton,
    UnsavedChangesDialog,
    InterventionEffortForm,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionEffortSheet {
  /**
   * Property workloadOrganizationId
   * @readonly
   *
   * @description
   * Organization used for optional assignment load.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly workloadOrganizationId: InputSignal<string> = input('');

  /**
   * Property workloadStartsOn
   * @readonly
   *
   * @description
   * Inherited intervention period start.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string | null>}
   */
  public readonly workloadStartsOn: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property workloadEndsOn
   * @readonly
   *
   * @description
   * Inherited intervention period end.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string | null>}
   */
  public readonly workloadEndsOn: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property item
   * @readonly
   *
   * @description
   * Captured task.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<InterventionWorkItemOutput>}
   */
  public readonly item: InputSignal<InterventionWorkItemOutput> =
    input.required<InterventionWorkItemOutput>();

  /**
   * Property mode
   * @readonly
   *
   * @description
   * Explicit operation.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<'remaining' | 'planning'>}
   */
  public readonly mode: InputSignal<'remaining' | 'planning'> = input.required<
    'remaining' | 'planning'
  >();

  /**
   * Property members
   * @readonly
   *
   * @description
   * Assignment options.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly MemberSelectOption[]>}
   */
  public readonly members: InputSignal<readonly MemberSelectOption[]> = input<
    readonly MemberSelectOption[]
  >([]);

  /**
   * Property pending
   * @readonly
   *
   * @description
   * In-flight write.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input(false);

  /**
   * Property error
   * @readonly
   *
   * @description
   * Owned row failure.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string | null>}
   */
  public readonly error: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property online
   * @readonly
   *
   * @description
   * Offline proposals cannot be assessed globally.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly online: InputSignal<boolean> = input(true);

  /**
   * Property submitted
   * @readonly
   *
   * @description
   * Reviewed task changes.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<UpdateInterventionWorkItemInput>}
   */
  public readonly submitted: OutputEmitterRef<UpdateInterventionWorkItemInput> = output();

  /**
   * Property closed
   * @readonly
   *
   * @description
   * Dismissal after dirty guard.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly closed: OutputEmitterRef<void> = output();

  /**
   * Property side
   * @readonly
   *
   * @description
   * Adaptive native sheet.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<'right' | 'bottom'>}
   */
  protected readonly side: Signal<'right' | 'bottom'> = sheetSide();

  /**
   * Property sheet
   * @readonly
   *
   * @description
   * Reopens after intercepted dismissal.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Signal<HlmSheet | undefined>}
   */
  private readonly sheet: Signal<HlmSheet | undefined> = viewChild(HlmSheet);

  /**
   * Property dirty
   * @readonly
   *
   * @description
   * Unsaved form changes.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly dirty: WritableSignal<boolean> = signal(false);

  /**
   * Property discard
   * @readonly
   *
   * @description
   * Explicit discard confirmation.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly discard: WritableSignal<boolean> = signal(false);

  /**
   * Method requestClose
   * @method requestClose
   *
   * @description
   * Prevents backdrop dismissal from losing an effort edit.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected requestClose(): void {
    if (this.pending()) {
      this.sheet()?.open();
      return;
    }
    if (this.dirty()) {
      this.sheet()?.open();
      this.discard.set(true);
    } else this.closed.emit();
  }
}
