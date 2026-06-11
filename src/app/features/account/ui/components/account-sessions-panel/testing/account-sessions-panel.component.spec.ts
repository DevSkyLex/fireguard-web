import { TestBed } from '@angular/core/testing';
import { ConfirmationService, type Confirmation } from 'primeng/api';
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
      ...overrides,
    }) as SessionOutput;

  const setup = () => {
    const mockSessionStore = {
      loadSessions: vi.fn(),
      revoke: vi.fn(),
      revokeAll: vi.fn(),
    };
    const mockConfirmationService = {
      confirm: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: SessionStore, useValue: mockSessionStore },
        { provide: ConfirmationService, useValue: mockConfirmationService },
      ],
    });

    const component = TestBed.runInInjectionContext(() => new AccountSessionsPanel());
    return { component, mockSessionStore, mockConfirmationService };
  };

  it('should forward lazy table load requests to the store', () => {
    const { component, mockSessionStore } = setup();

    (component as unknown as { load: (o: object) => void }).load({ page: 2, itemsPerPage: 10 });

    expect(mockSessionStore.loadSessions).toHaveBeenCalledWith({ page: 2, itemsPerPage: 10 });
  });

  it('should retry the last requested page', () => {
    const { component, mockSessionStore } = setup();

    (component as unknown as { load: (o: object) => void }).load({ page: 3, itemsPerPage: 20 });
    (component as unknown as { reload: () => void }).reload();

    expect(mockSessionStore.loadSessions).toHaveBeenLastCalledWith({ page: 3, itemsPerPage: 20 });
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
