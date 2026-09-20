import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
} from '@angular/core';
import type { WorkloadAssessment } from '@features/organization/features/workload/models';
import { formatDurationMinutes } from '@shared/duration-format';
import { HlmAlertImports } from '@shared/ui/alert';
import { HlmAlertDialogImports } from '@shared/ui/alert-dialog';

/**
 * Component WorkloadConfirmationDialog
 * @class WorkloadConfirmationDialog
 *
 * @description
 * Explicit agreement to a server-calculated overload. A changed assessment must be reviewed again.
 *
 * @version 1.0.0
 */
@Component({
  selector: 'app-workload-confirmation-dialog',
  templateUrl: './workload-confirmation-dialog.component.html',
  imports: [DatePipe, HlmAlertDialogImports, HlmAlertImports],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkloadConfirmationDialog {
  /**
   * Property assessment
   * @readonly
   *
   * @description
   * Exact server assessment.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<WorkloadAssessment>}
   */
  public readonly assessment: InputSignal<WorkloadAssessment> =
    input.required<WorkloadAssessment>();

  /**
   * Property memberNames
   * @readonly
   *
   * @description
   * Available member labels.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<Readonly<Record<string, string>>>}
   */
  public readonly memberNames: InputSignal<Readonly<Partial<Record<string, string>>>> = input<
    Readonly<Partial<Record<string, string>>>
  >({});

  /**
   * Property confirmed
   * @readonly
   *
   * @description
   * Opaque token for only the reviewed proposal.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<string>}
   */
  public readonly confirmed: OutputEmitterRef<string> = output();

  /**
   * Property cancelled
   * @readonly
   *
   * @description
   * No planning change should be persisted.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly cancelled: OutputEmitterRef<void> = output();

  /**
   * Property duration
   * @readonly
   *
   * @description
   * Consistent duration display.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {typeof formatDurationMinutes}
   */
  protected readonly duration: typeof formatDurationMinutes = formatDurationMinutes;
}
