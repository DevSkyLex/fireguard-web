import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import type { TrustedDeviceOutput } from '@features/auth/models';

/**
 * Table presenting trusted devices and revocation actions.
 */
@Component({
  selector: 'app-trusted-device-table',
  imports: [ButtonModule, CardModule, DatePipe, SkeletonModule, TableModule],
  templateUrl: './trusted-device-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrustedDeviceTable {
  /** Trusted devices to display. */
  public readonly devices: InputSignal<readonly TrustedDeviceOutput[]> = input.required();
  /** Whether trusted devices are loading. */
  public readonly loading: InputSignal<boolean> = input(false);
  /** Whether a revocation is pending. */
  public readonly revoking: InputSignal<boolean> = input(false);
  /** Emits a trusted device selected for revocation. */
  public readonly revoke: OutputEmitterRef<TrustedDeviceOutput> = output();
  /** Placeholder rows displayed while loading. */
  protected readonly skeletonItems = Array(5);
}
