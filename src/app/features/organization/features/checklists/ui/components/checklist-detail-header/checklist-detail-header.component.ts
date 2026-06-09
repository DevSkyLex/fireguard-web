import { DatePipe, TitleCasePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
} from '@angular/core';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import type { ChecklistOutput } from '@features/organization/features/checklists/models';

/**
 * Header presenting checklist identity and available contextual actions.
 */
@Component({
  selector: 'app-checklist-detail-header',
  imports: [AvatarModule, ButtonModule, DatePipe, TagModule, TitleCasePipe],
  templateUrl: './checklist-detail-header.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChecklistDetailHeader {
  /** Checklist presented by the header. */
  public readonly checklist: InputSignal<ChecklistOutput> = input.required();
  /** Whether the active member can manage the checklist. */
  public readonly canManage: InputSignal<boolean> = input(false);
  /** Whether checklist archival is pending. */
  public readonly archiving: InputSignal<boolean> = input(false);
  /** Emits a request to return to the checklist list. */
  public readonly back: OutputEmitterRef<void> = output();
  /** Emits a request to archive the checklist. */
  public readonly archive: OutputEmitterRef<void> = output();
}
