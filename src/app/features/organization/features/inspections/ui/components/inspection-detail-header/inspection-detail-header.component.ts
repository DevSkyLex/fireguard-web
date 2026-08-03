import { DatePipe, formatDate } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  LOCALE_ID,
  output,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
} from '@angular/core';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import {
  resolveInspectionTag,
  type InspectionOutput,
} from '@features/organization/features/inspections/models';
import { PageHeader } from '@shared/page-header';
import { type TagDescriptor } from '@shared/tag';

/**
 * Header presenting inspection identity, status and lifecycle actions.
 */
@Component({
  selector: 'app-inspection-detail-header',
  imports: [AvatarModule, ButtonModule, DatePipe, PageHeader, TagModule],
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
  /** Localized fallback shown when the inspector identity is unavailable. */
  protected readonly unknownInspectorLabel: string = $localize`:@@inspection.unknownInspector:Unknown inspector`;

  /** Active locale, used to format {@link headerTitle}'s date the same way the `date` pipe would. */
  private readonly localeId: string = inject<string>(LOCALE_ID);

  /** `app-page-header` title: "Inspection {performedAt, mediumDate}". */
  protected readonly headerTitle: Signal<string> = computed<string>(() => {
    const performedAt: string = formatDate(
      this.inspection().performedAt,
      'mediumDate',
      this.localeId,
    );
    return $localize`:@@inspection.header.title:Inspection ${performedAt}:INTERPOLATION:`;
  });

  /** Resolves the status badge descriptor for the inspection. */
  protected statusDescriptor(status: string): TagDescriptor {
    return resolveInspectionTag('status', status);
  }

  /** Resolves the result badge descriptor for the inspection. */
  protected resultDescriptor(result: string): TagDescriptor {
    return resolveInspectionTag('result', result);
  }
}
