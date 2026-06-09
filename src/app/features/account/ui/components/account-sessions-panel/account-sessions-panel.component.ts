import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  type WritableSignal,
} from '@angular/core';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { MessageModule } from 'primeng/message';
import { SessionTable } from '@features/account/ui/tables';
import type { SessionOutput } from '@features/auth/models';
import { SessionStore } from '@features/auth/state';

/**
 * Component AccountSessionsPanel
 * @class AccountSessionsPanel
 *
 * @description
 * Active sessions section of the account page. Coordinates active session
 * revocation and renders the session list. Rendered inside the "Security"
 * tab of {@link AccountPage}.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-account-sessions-panel',
  imports: [ButtonModule, DialogModule, MessageModule, SessionTable],
  providers: [SessionStore],
  templateUrl: './account-sessions-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountSessionsPanel {
  /** PrimeNG confirmation service used before revocation. */
  private readonly confirmationService: ConfirmationService = inject(ConfirmationService);
  /** Account session store exposed to the template. */
  protected readonly store: SessionStore = inject(SessionStore);
  /** Session selected for detail display. */
  protected readonly selectedSession: WritableSignal<SessionOutput | null> = signal(null);

  /** Loads the initial active session collection. */
  public constructor() {
    this.reload();
  }

  /** Reloads the active session collection. */
  protected reload(): void {
    this.store.loadSessions({ itemsPerPage: 30 });
  }

  /** Confirms and revokes one active session. */
  protected revoke(session: SessionOutput): void {
    if (session.isCurrent) return;
    this.confirmationService.confirm({
      header: 'Revoke session',
      message: `Revoke the session from ${session.browser || session.deviceType || 'this device'}?`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: 'Revoke', severity: 'danger' },
      rejectButtonProps: { label: 'Cancel', severity: 'secondary', outlined: true },
      accept: () => {
        this.store.revoke(session.id);
        this.selectedSession.set(null);
      },
    });
  }

  /** Confirms and revokes all other active sessions. */
  protected revokeAll(): void {
    this.confirmationService.confirm({
      header: 'Revoke other sessions',
      message: 'Revoke every active session except the current one?',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: 'Revoke all', severity: 'danger' },
      rejectButtonProps: { label: 'Cancel', severity: 'secondary', outlined: true },
      accept: () => this.store.revokeAll(),
    });
  }
}
