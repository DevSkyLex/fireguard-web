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
import type { InspectionOutput } from '@features/organization/features/inspections/models';

/**
 * Header presenting inspection identity, status and lifecycle actions.
 */
@Component({
  selector: 'app-inspection-detail-header',
  imports: [AvatarModule, ButtonModule, DatePipe, TagModule, TitleCasePipe],
  templateUrl: './inspection-detail-header.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InspectionDetailHeader {
  /** Inspection presented by the header. */
  public readonly inspection: InputSignal<InspectionOutput> = input.required();
  /** Whether the active member can mutate inspections. */
  public readonly canManage: InputSignal<boolean> = input(false);
  /** Whether an inspection mutation is pending. */
  public readonly loading: InputSignal<boolean> = input(false);
  /** Emits an inspection edit request. */
  public readonly edit: OutputEmitterRef<void> = output();
  /** Emits an inspection submission request. */
  public readonly submitInspection: OutputEmitterRef<void> = output();
  /** Emits an inspection close request. */
  public readonly closeInspection: OutputEmitterRef<void> = output();
  /** Emits an inspection cancellation request. */
  public readonly cancelInspection: OutputEmitterRef<void> = output();
}
