import type { BooleanInput } from '@angular/cdk/coercion';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  type InputSignal,
  type InputSignalWithTransform,
  type OutputEmitterRef,
  type Signal,
} from '@angular/core';
import type {
  InterventionWorkItemStatus,
  InterventionWorkItemStatusChange,
} from '@features/organization/features/interventions/models';
import { HlmCheckbox } from '@shared/ui/checkbox';
import { HlmSpinner } from '@shared/ui/spinner';

/**
 * The intervention workflow control used to complete or reopen one work item.
 * It keeps workflow status semantics out of collection tables while exposing a
 * real Spartan checkbox to assistive technology and pointer users.
 */
@Component({
  selector: 'app-intervention-work-item-checkbox',
  imports: [HlmCheckbox, HlmSpinner],
  templateUrl: './intervention-work-item-checkbox.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionWorkItemCheckbox {
  /** Work item identifier included in the emitted workflow change. */
  public readonly workItemId: InputSignal<string> = input.required<string>();

  /** Unique identifier for this responsive rendering of the control. */
  public readonly controlId: InputSignal<string> = input.required<string>();

  /** Current workflow status. */
  public readonly status: InputSignal<InterventionWorkItemStatus> =
    input.required<InterventionWorkItemStatus>();

  /** Accessible action or state label for the checkbox. */
  public readonly ariaLabel: InputSignal<string> = input.required<string>();

  /** Whether this operator may update the work item. */
  public readonly disabled: InputSignalWithTransform<boolean, BooleanInput> = input<
    boolean,
    BooleanInput
  >(false, { transform: booleanAttribute });

  /** Whether this work item's status update is being persisted. */
  public readonly pending: InputSignalWithTransform<boolean, BooleanInput> = input<
    boolean,
    BooleanInput
  >(false, { transform: booleanAttribute });

  /** A requested transition between completed and planned. */
  public readonly statusChanged: OutputEmitterRef<InterventionWorkItemStatusChange> =
    output<InterventionWorkItemStatusChange>();

  /** Checked is reserved for completed work; skipped work remains a distinct state. */
  protected readonly checked: Signal<boolean> = computed<boolean>(
    () => this.status() === 'completed',
  );

  /** Stable DOM id used by the enlarged label hit target. */
  protected readonly inputId: Signal<string> = computed<string>(
    () => `intervention-work-item-checkbox-${this.controlId()}`,
  );

  /** Skipped work is resolved through its own workflow and cannot be reopened here. */
  protected readonly isDisabled: Signal<boolean> = computed<boolean>(
    () => this.disabled() || this.pending() || this.status() === 'skipped',
  );

  /** Converts the checkbox value into the intervention workflow transition. */
  protected checkedChanged(checked: boolean): void {
    if (this.isDisabled()) return;

    this.statusChanged.emit({
      workItemId: this.workItemId(),
      status: checked ? 'completed' : 'planned',
    });
  }
}
