import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, type InputSignal } from '@angular/core';
import {
  resolveInspectionTag,
  type InspectionOutput,
} from '@features/organization/features/inspections/models';
import { Tag, type TagDescriptor } from '@shared/components';

/**
 * Read-only panel presenting inspection metadata.
 */
@Component({
  selector: 'app-inspection-information-panel',
  imports: [DatePipe, Tag],
  templateUrl: './inspection-information-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InspectionInformationPanel {
  /** Inspection metadata to display. */
  public readonly inspection: InputSignal<InspectionOutput> = input.required();
  /** Localized placeholder for empty reference fields. */
  protected readonly noneLabel: string = $localize`:@@inspection.info.none:None`;
  /** Localized placeholder shown when no notes are recorded. */
  protected readonly noNotesLabel: string = $localize`:@@inspection.info.noNotes:No notes`;

  /** Resolves the result badge descriptor for the inspection. */
  protected resultDescriptor(result: string): TagDescriptor {
    return resolveInspectionTag('result', result);
  }
}
