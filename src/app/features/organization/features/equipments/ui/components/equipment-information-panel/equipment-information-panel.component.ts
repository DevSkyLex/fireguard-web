import { DatePipe, TitleCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, type InputSignal } from '@angular/core';
import {
  resolveEquipmentTag,
  type EquipmentOutput,
} from '@features/organization/features/equipments/models';
import { Tag, type TagDescriptor } from '@shared/components';

/**
 * Read-only panel presenting equipment metadata.
 */
@Component({
  selector: 'app-equipment-information-panel',
  imports: [DatePipe, TitleCasePipe, Tag],
  templateUrl: './equipment-information-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EquipmentInformationPanel {
  /** Equipment metadata to display. */
  public readonly equipment: InputSignal<EquipmentOutput> = input.required();

  /** Resolves the presentation descriptor for the equipment's type tile. */
  protected typeDescriptor(type: string): TagDescriptor {
    return resolveEquipmentTag('type', type);
  }
}
