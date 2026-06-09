import { DatePipe, TitleCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, type InputSignal } from '@angular/core';
import { TagModule } from 'primeng/tag';
import type { EquipmentOutput } from '@features/organization/features/equipments/models';

/**
 * Read-only panel presenting equipment metadata.
 */
@Component({
  selector: 'app-equipment-information-panel',
  imports: [DatePipe, TagModule, TitleCasePipe],
  templateUrl: './equipment-information-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EquipmentInformationPanel {
  /** Equipment metadata to display. */
  public readonly equipment: InputSignal<EquipmentOutput> = input.required();
}
