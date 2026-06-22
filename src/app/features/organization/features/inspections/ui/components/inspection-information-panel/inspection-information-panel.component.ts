import { DatePipe, TitleCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, type InputSignal } from '@angular/core';
import { TagModule } from 'primeng/tag';
import type { InspectionOutput } from '@features/organization/features/inspections/models';

/**
 * Read-only panel presenting inspection metadata.
 */
@Component({
  selector: 'app-inspection-information-panel',
  imports: [DatePipe, TagModule, TitleCasePipe],
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
}
