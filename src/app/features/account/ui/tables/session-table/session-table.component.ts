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
import type { SessionOutput } from '@features/auth/models';

/**
 * Table presenting active account sessions and revocation actions.
 */
@Component({
  selector: 'app-session-table',
  imports: [ButtonModule, CardModule, DatePipe, SkeletonModule, TableModule],
  templateUrl: './session-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SessionTable {
  /** Active sessions to display. */
  public readonly sessions: InputSignal<readonly SessionOutput[]> = input.required();
  /** Whether sessions are loading. */
  public readonly loading: InputSignal<boolean> = input(false);
  /** Whether a revocation is pending. */
  public readonly revoking: InputSignal<boolean> = input(false);
  /** Emits a session selected for detail display. */
  public readonly details: OutputEmitterRef<SessionOutput> = output();
  /** Emits a session selected for revocation. */
  public readonly revoke: OutputEmitterRef<SessionOutput> = output();
  /** Placeholder rows displayed while loading. */
  protected readonly skeletonItems = Array(5);
}
