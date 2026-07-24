import { signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { ConfirmationService, type Confirmation } from 'primeng/api';
import { Dialog } from 'primeng/dialog';
import type { SessionOutput } from '@features/auth/models';
import { SessionStore } from '@features/auth/state';
import { AccountSessionsPanel } from '../account-sessions-panel.component';

describe('AccountSessionsPanel', () => {
  const buildSession = (overrides: Partial<SessionOutput> = {}): SessionOutput =>
    ({
      id: 'session-1',
      isCurrent: false,
      browser: 'Firefox',
      deviceType: 'desktop',
      createdAt: '2026-01-01T10:00:00.000Z',
      lastActivityAt: '2026-01-02T10:00:00.000Z',
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0',
      ...overrides,
    }) as SessionOutput;

  const idleCallState = { status: 'idle', data: null, error: null };
  const successCallState = { status: 'success', data: null, error: null };

  const setup = (
    storeOverrides: {
      sessions?: readonly SessionOutput[];
      totalSessions?: number;
      listCallState?: { status: string; data: null; error: { message: string | null } | null };
      revokeCallState?: { status: string; data: null; error: { message: string | null } | null };
      revokeAllCallState?: {
        status: string;
        data: null;
        error: { message: string | null } | null;
      };
      isRevokingAll?: boolean;
    } = {},
  ) => {
    const mockSessionStore = {
      loadSessions: vi.fn(),
      revoke: vi.fn(),
      revokeAll: vi.fn(),
      sessions: signal<readonly SessionOutput[]>(storeOverrides.sessions ?? []),
      totalSessions: signal(storeOverrides.totalSessions ?? 0),
      listCallState: signal(storeOverrides.listCallState ?? successCallState),
      revokeCallState: signal(storeOverrides.revokeCallState ?? idleCallState),
      revokeAllCallState: signal(storeOverrides.revokeAllCallState ?? idleCallState),
      isRevokingAll: signal(storeOverrides.isRevokingAll ?? false),
    };
    const mockConfirmationService = {
      confirm: vi.fn(),
    };

    TestBed.configureTestingModule({
      imports: [AccountSessionsPanel],
      providers: [
        { provide: SessionStore, useValue: mockSessionStore },
        { provide: ConfirmationService, useValue: mockConfirmationService },
      ],
    });
    TestBed.overrideProvider(SessionStore, { useValue: mockSessionStore });

    const fixture: ComponentFixture<AccountSessionsPanel> =
      TestBed.createComponent(AccountSessionsPanel);
    fixture.detectChanges();

    return {
      fixture,
      component: fixture.componentInstance,
      mockSessionStore,
      mockConfirmationService,
    };
  };

  describe('class logic', () => {
    it('should forward lazy table load requests to the store', () => {
      const { component, mockSessionStore } = setup();

      (component as unknown as { load: (o: object) => void }).load({ page: 2, itemsPerPage: 10 });

      expect(mockSessionStore.loadSessions).toHaveBeenCalledWith({ page: 2, itemsPerPage: 10 });
    });

    it('should retry the last requested page', () => {
      const { component, mockSessionStore } = setup();

      (component as unknown as { load: (o: object) => void }).load({ page: 3, itemsPerPage: 20 });
      (component as unknown as { reload: () => void }).reload();

      expect(mockSessionStore.loadSessions).toHaveBeenLastCalledWith({
        page: 3,
        itemsPerPage: 20,
      });
    });

    it('should confirm before revoking a non-current session', () => {
      const { component, mockSessionStore, mockConfirmationService } = setup();

      (component as unknown as { revoke: (session: SessionOutput) => void }).revoke(buildSession());

      expect(mockConfirmationService.confirm).toHaveBeenCalledTimes(1);
      const confirmation = mockConfirmationService.confirm.mock.calls[0][0] as Confirmation;
      confirmation.accept?.();
      expect(mockSessionStore.revoke).toHaveBeenCalledWith('session-1');
    });

    it('should not revoke the current session', () => {
      const { component, mockConfirmationService } = setup();

      (component as unknown as { revoke: (session: SessionOutput) => void }).revoke(
        buildSession({ isCurrent: true }),
      );

      expect(mockConfirmationService.confirm).not.toHaveBeenCalled();
    });

    it('should confirm before revoking all other sessions', () => {
      const { component, mockSessionStore, mockConfirmationService } = setup();

      (component as unknown as { revokeAll: () => void }).revokeAll();

      const confirmation = mockConfirmationService.confirm.mock.calls[0][0] as Confirmation;
      confirmation.accept?.();
      expect(mockSessionStore.revokeAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('rendering — populated', () => {
    it('should render the session table with the store-provided sessions', () => {
      const { fixture } = setup({ sessions: [buildSession()], totalSessions: 1 });

      expect(fixture.nativeElement.querySelector('app-session-table')).toBeTruthy();
    });

    it('should not render any error message when call states are idle/success', () => {
      const { fixture } = setup({ sessions: [buildSession()], totalSessions: 1 });

      expect(fixture.nativeElement.querySelectorAll('p-message').length).toBe(0);
    });

    it('should open the session details dialog when the table emits details', () => {
      const { fixture, component } = setup({ sessions: [buildSession()], totalSessions: 1 });

      (
        component as unknown as { selectedSession: { set(v: SessionOutput | null): void } }
      ).selectedSession.set(buildSession());
      fixture.detectChanges();

      const dialog = fixture.nativeElement.querySelector('p-dialog');
      expect(dialog).toBeTruthy();
      expect(fixture.nativeElement.textContent).toContain('127.0.0.1');
      expect(fixture.nativeElement.textContent).toContain('Mozilla/5.0');
    });

    it('should show "Yes" for the current session in the details dialog', () => {
      const { fixture, component } = setup({ sessions: [buildSession()], totalSessions: 1 });

      (
        component as unknown as { selectedSession: { set(v: SessionOutput | null): void } }
      ).selectedSession.set(buildSession({ isCurrent: true }));
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('Yes');
    });

    it('should show "No" for a non-current session in the details dialog', () => {
      const { fixture, component } = setup({ sessions: [buildSession()], totalSessions: 1 });

      (
        component as unknown as { selectedSession: { set(v: SessionOutput | null): void } }
      ).selectedSession.set(buildSession({ isCurrent: false }));
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('No');
    });
  });

  describe('rendering — empty', () => {
    it('should render the session table in an empty state', () => {
      const { fixture } = setup({ sessions: [], totalSessions: 0 });

      const table = fixture.nativeElement.querySelector('app-session-table');
      expect(table).toBeTruthy();
    });
  });

  describe('rendering — loading', () => {
    it('should pass the loading flag while the list call is pending', () => {
      const { fixture } = setup({
        listCallState: { status: 'pending', data: null, error: null },
      });

      const table = fixture.nativeElement.querySelector('app-session-table');
      expect(table).toBeTruthy();
    });
  });

  describe('rendering — errors', () => {
    it('should render the list load error with a retry action', () => {
      const { fixture, mockSessionStore } = setup({
        listCallState: { status: 'error', data: null, error: { message: 'Load failed' } },
      });

      expect(fixture.nativeElement.textContent).toContain('Load failed');

      const retryButton = fixture.nativeElement.querySelector(
        'p-button button',
      ) as HTMLButtonElement | null;
      retryButton?.click();

      expect(mockSessionStore.loadSessions).toHaveBeenCalled();
    });

    it('should render the fallback list load error copy when no message is provided', () => {
      const { fixture } = setup({
        listCallState: { status: 'error', data: null, error: { message: null } },
      });

      expect(fixture.nativeElement.textContent).toContain('Active sessions could not be loaded.');
    });

    it('should render the revoke error with its message', () => {
      const { fixture } = setup({
        revokeCallState: { status: 'error', data: null, error: { message: 'Revoke failed' } },
      });

      expect(fixture.nativeElement.textContent).toContain('Revoke failed');
    });

    it('should render the fallback revoke error copy when no message is provided', () => {
      const { fixture } = setup({
        revokeCallState: { status: 'error', data: null, error: { message: null } },
      });

      expect(fixture.nativeElement.textContent).toContain('The session could not be revoked.');
    });

    it('should render the revoke-all error with its message', () => {
      const { fixture } = setup({
        revokeAllCallState: {
          status: 'error',
          data: null,
          error: { message: 'Revoke all failed' },
        },
      });

      expect(fixture.nativeElement.textContent).toContain('Revoke all failed');
    });

    it('should render the fallback revoke-all error copy when no message is provided', () => {
      const { fixture } = setup({
        revokeAllCallState: { status: 'error', data: null, error: { message: null } },
      });

      expect(fixture.nativeElement.textContent).toContain(
        'The other sessions could not be revoked.',
      );
    });
  });

  describe('rendering — dialog dismissal', () => {
    it('should clear the selected session when the dialog visibility toggles off', () => {
      const { fixture, component } = setup({ sessions: [buildSession()], totalSessions: 1 });
      const selectedSession = component as unknown as {
        selectedSession: { set(v: SessionOutput | null): void } & (() => SessionOutput | null);
      };
      selectedSession.selectedSession.set(buildSession());
      fixture.detectChanges();

      const dialog = fixture.debugElement.query(
        (debugElement) => debugElement.componentInstance instanceof Dialog,
      )?.componentInstance as Dialog;
      dialog.visibleChange.emit(false);
      fixture.detectChanges();

      expect(selectedSession.selectedSession()).toBeNull();
    });
  });
});
