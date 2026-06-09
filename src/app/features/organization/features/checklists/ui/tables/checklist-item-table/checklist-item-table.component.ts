import { ChangeDetectionStrategy, Component, input, type InputSignal } from '@angular/core';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import type { ChecklistItemOutput } from '@features/organization/features/checklists/models';

/**
 * Read-only table presenting the item rows of a checklist.
 */
@Component({
  selector: 'app-checklist-item-table',
  imports: [TableModule, TagModule],
  templateUrl: './checklist-item-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChecklistItemTable {
  /** Checklist item rows to display. */
  public readonly items: InputSignal<readonly ChecklistItemOutput[]> = input.required();
}
