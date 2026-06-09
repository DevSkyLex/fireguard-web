import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
} from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ChipModule } from 'primeng/chip';
import { InputTextModule } from 'primeng/inputtext';
import type { EquipmentTagOutput } from '@features/organization/features/equipments/models';

/**
 * Panel coordinating equipment tag creation and removal.
 */
@Component({
  selector: 'app-equipment-tags-panel',
  imports: [ButtonModule, ChipModule, InputTextModule, ReactiveFormsModule],
  templateUrl: './equipment-tags-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EquipmentTagsPanel {
  /** Equipment tags to display. */
  public readonly tags: InputSignal<readonly EquipmentTagOutput[]> = input.required();
  /** Whether the active member can manage tags. */
  public readonly canManage: InputSignal<boolean> = input(false);
  /** Whether a tag mutation is pending. */
  public readonly loading: InputSignal<boolean> = input(false);
  /** Emits a tag name selected for creation. */
  public readonly add: OutputEmitterRef<string> = output();
  /** Emits a tag selected for removal. */
  public readonly remove: OutputEmitterRef<EquipmentTagOutput> = output();
  /** New tag name control. */
  protected readonly control = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required],
  });

  /** Emits a trimmed tag name and resets the control. */
  protected submit(): void {
    const name = this.control.value.trim();
    if (!name) return;
    this.add.emit(name);
    this.control.reset();
  }
}
