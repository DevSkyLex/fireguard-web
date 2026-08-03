import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  type WritableSignal,
} from '@angular/core';
import { ConfirmationService } from 'primeng/api';
import { DialogModule } from 'primeng/dialog';
import type { RequestOptions } from '@core/api';
import { SessionTable } from '@features/account/ui/tables';
import type { SessionOutput } from '@features/auth/models';
import { SessionStore } from '@features/auth/state';
import { ErrorBanner } from '@shared/error-state';
import { DIALOG_BREAKPOINTS, DIALOG_WIDTH_LG } from '@shared/overlay-size';

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
  imports: [DatePipe, DialogModule, ErrorBanner, SessionTable],
  providers: [SessionStore],
  templateUrl: './account-sessions-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountSessionsPanel {
  /** PrimeNG confirmation service used before revocation. */
  private readonly confirmationService: ConfirmationService =
    inject<ConfirmationService>(ConfirmationService);
  /** Account session store exposed to the template. */
  protected readonly store: SessionStore = inject<SessionStore>(SessionStore);
  /** Session selected for detail display. */
  protected readonly selectedSession: WritableSignal<SessionOutput | null> = signal(null);
  /** Last table request replayed after a list-loading error. */
  private lastLoadOptions: RequestOptions = { page: 1, itemsPerPage: 10 };
  /** Canonical `p-dialog` width for the two-column session detail body. */
  protected readonly dialogWidth: string = DIALOG_WIDTH_LG;
  /** Canonical `p-dialog` responsive breakpoints (DESIGN.md, "Overlays — sizes"). */
  protected readonly dialogBreakpoints: Record<string, string> = DIALOG_BREAKPOINTS;
  /** Fallback message shown when the session list fails to load without a server message. */
  protected readonly loadErrorMessage: string = $localize`:@@account.sessions.loadError:Active sessions could not be loaded.`;
  /** Fallback message shown when revoking a single session fails without a server message. */
  protected readonly revokeErrorMessage: string = $localize`:@@account.sessions.revokeError:The session could not be revoked.`;
  /** Fallback message shown when revoking all other sessions fails without a server message. */
  protected readonly revokeAllErrorMessage: string = $localize`:@@account.sessions.revokeAllError:The other sessions could not be revoked.`;

  /** Loads a session page requested by the lazy table. */
  protected load(options: RequestOptions): void {
    this.lastLoadOptions = options;
    this.store.loadSessions(options);
  }

  /** Replays the failed session-page request. */
  protected reload(): void {
    this.store.loadSessions(this.lastLoadOptions);
  }

  /** Confirms and revokes one active session. */
  protected revoke(session: SessionOutput): void {
    if (session.isCurrent) return;
    this.confirmationService.confirm({
      header: $localize`:@@account.sessions.revokeHeader:Revoke session`,
      message: $localize`:@@account.sessions.revokeConfirm:Revoke the session from ${session.browser || session.deviceType || 'this device'}:device:?`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: $localize`:@@common.revoke:Revoke`, severity: 'danger' },
      rejectButtonProps: {
        label: $localize`:@@common.cancel:Cancel`,
        severity: 'secondary',
        outlined: true,
      },
      accept: () => {
        this.store.revoke(session.id);
        this.selectedSession.set(null);
      },
    });
  }

  /** Confirms and revokes all other active sessions. */
  protected revokeAll(): void {
    this.confirmationService.confirm({
      header: $localize`:@@account.sessions.revokeAllHeader:Revoke other sessions`,
      message: $localize`:@@account.sessions.revokeAllConfirm:Revoke every active session except the current one?`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: $localize`:@@common.revokeAll:Revoke all`, severity: 'danger' },
      rejectButtonProps: {
        label: $localize`:@@common.cancel:Cancel`,
        severity: 'secondary',
        outlined: true,
      },
      accept: () => this.store.revokeAll(),
    });
  }
}
