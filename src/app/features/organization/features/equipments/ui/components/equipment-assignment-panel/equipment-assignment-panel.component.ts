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
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';

/** Select option used by the equipment assignment panel. */
export interface EquipmentFacilityOption {
  readonly label: string;
  readonly value: string;
}

/**
 * Panel coordinating facility assignment for an equipment.
 */
@Component({
  selector: 'app-equipment-assignment-panel',
  imports: [ButtonModule, ReactiveFormsModule, SelectModule],
  templateUrl: './equipment-assignment-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EquipmentAssignmentPanel {
  /** Identifier of the currently assigned facility. */
  public readonly facilityId: InputSignal<string | null | undefined> = input();
  /** Facilities available for assignment. */
  public readonly options: InputSignal<readonly EquipmentFacilityOption[]> = input.required();
  /** Whether the active member can change assignment. */
  public readonly canManage: InputSignal<boolean> = input(false);
  /** Whether an assignment mutation is pending. */
  public readonly loading: InputSignal<boolean> = input(false);
  /** Emits a facility selected for assignment. */
  public readonly assign: OutputEmitterRef<string> = output();
  /** Emits a request to remove the current assignment. */
  public readonly unassign: OutputEmitterRef<void> = output();
  /** Facility selection control. */
  protected readonly control = new FormControl<string | null>(null);
  /** Human-readable label of the currently assigned facility. */
  protected readonly currentFacilityLabel: Signal<string> = computed(
    () =>
      this.options().find((option) => option.value === this.facilityId())?.label ?? 'Unassigned',
  );
}
