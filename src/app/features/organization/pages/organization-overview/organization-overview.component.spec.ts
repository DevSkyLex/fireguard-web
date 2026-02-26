import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { OrganizationOverviewPage } from './organization-overview.component';
import { AuthStore } from '@core/stores/auth';
import { UserStore } from '@core/stores/user';

describe('OrganizationOverviewPage', () => {
  const setup = (status: 'idle' | 'loading' | 'success' | 'error' = 'idle') => {
    const mockAuthStore = {
      logout: vi.fn(),
      isLoggingOut: signal(false),
      logoutOperation: signal({
        status,
        data: null,
        error: null,
      }),
    };
    const mockUserStore = {
      isLoading: signal(false),
      avatarUrl: signal<string | null>(null),
      initials: signal<string | null>('U'),
      profile: signal<any>(null),
      displayName: signal<string | null>(null),
      loadError: signal<any>(null),
    };
    const mockRouter = { navigate: vi.fn().mockResolvedValue(true) };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthStore, useValue: mockAuthStore },
        { provide: UserStore, useValue: mockUserStore },
        { provide: Router, useValue: mockRouter },
      ],
    });

    const component = TestBed.runInInjectionContext(() => new OrganizationOverviewPage());
    TestBed.tick();
    return { component, mockAuthStore, mockRouter };
  };

  it('should call logout when logout action is triggered', () => {
    const { component, mockAuthStore } = setup();

    (component as any).onLogout();

    expect(mockAuthStore.logout).toHaveBeenCalledTimes(1);
  });

  it('should navigate to login when logout operation succeeds', () => {
    const { mockRouter } = setup('success');
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/login']);
  });

  it('should navigate to login when logout operation fails', () => {
    const { mockRouter } = setup('error');
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/login']);
  });
});
