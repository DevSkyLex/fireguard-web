import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
  viewChild,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { MenuItem, PrimeIcons } from 'primeng/api';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { CardModule, type CardPassThroughOptions } from 'primeng/card';
import { Menu, MenuModule } from 'primeng/menu';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule, type TablePassThroughOptions } from 'primeng/table';
import type { SessionOutput } from '@features/auth/models';

/**
 * Table presenting active account sessions and revocation actions.
 */
@Component({
  selector: 'app-session-table',
  imports: [
    AvatarModule,
    ButtonModule,
    CardModule,
    DatePipe,
    MenuModule,
    SkeletonModule,
    TableModule,
  ],
  templateUrl: './session-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SessionTable {
  /** Active sessions to display. */
  public readonly sessions: InputSignal<readonly SessionOutput[]> = input.required();
  /** Whether sessions are loading. */
  public readonly loading: InputSignal<boolean> = input(false);
  /** Whether the revoke-all operation is pending. */
  public readonly revokingAll: InputSignal<boolean> = input(false);
  /** Whether at least one revocable session other than the current one exists. */
  public readonly hasOtherSessions: InputSignal<boolean> = input(false);
  /** Emits a session selected for detail display. */
  public readonly details: OutputEmitterRef<SessionOutput> = output();
  /** Emits a session selected for revocation. */
  public readonly revoke: OutputEmitterRef<SessionOutput> = output();
  /** Emits a request to revoke all other sessions. */
  public readonly revokeAll: OutputEmitterRef<void> = output();

  /** Placeholder rows displayed while loading. */
  protected readonly skeletonItems: undefined[] = Array(5);

  /** PrimeNG card pass-through classes matching the application table style. */
  protected readonly cardPt: CardPassThroughOptions = {
    root: {
      class:
        'flex flex-col border border-surface-200 dark:border-surface-800 bg-surface-0 dark:bg-surface-900 shadow-none',
    },
    body: { class: 'p-0' },
  };
  /** PrimeNG table pass-through classes. */
  protected readonly tablePt: TablePassThroughOptions = {
    table: { class: 'text-sm' },
  };

  /** Shared popup menu used by session rows for contextual actions. */
  private readonly actionMenu: Signal<Menu> = viewChild.required<Menu>('actionMenu');
  /** Session row currently targeted by the action menu. */
  private readonly selectedSession: WritableSignal<SessionOutput | null> =
    signal<SessionOutput | null>(null);

  /** Row action menu items resolved for the targeted session. */
  protected readonly actionMenuItems: Signal<MenuItem[]> = computed<MenuItem[]>((): MenuItem[] => {
    const session: SessionOutput | null = this.selectedSession();
    if (!session) return [];

    return [
      {
        label: 'View details',
        icon: PrimeIcons.EYE,
        command: (): void => this.details.emit(session),
      },
      ...(session.isCurrent
        ? []
        : [
            {
              label: 'Revoke',
              icon: PrimeIcons.TIMES_CIRCLE,
              styleClass: 'text-red-500',
              command: (): void => this.revoke.emit(session),
            },
          ]),
    ];
  });

  /** Stores the targeted session and toggles the shared action menu. */
  protected onActionMenuToggle(event: MouseEvent, session: SessionOutput): void {
    this.selectedSession.set(session);
    this.actionMenu().toggle(event);
  }
}
