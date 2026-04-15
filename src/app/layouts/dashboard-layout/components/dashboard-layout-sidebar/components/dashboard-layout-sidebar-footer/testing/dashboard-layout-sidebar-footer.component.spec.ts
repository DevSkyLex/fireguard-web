import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { USER_IDENTITY_PORT } from '@features/account/ports';
import { AuthStore } from '@features/auth/state';
import { DashboardLayoutSidebarFooter } from '../dashboard-layout-sidebar-footer.component';

describe('DashboardLayoutSidebarFooter', () => {
  const mockUserStore = {
    isLoading: signal(false),
    avatarUrl: signal<string | null>(null),
    initials: signal<string | null>('FG'),
    displayName: signal<string | null>('Fireguard User'),
    profile: signal<{ email?: string } | null>({ email: 'user@fireguard.local' }),
  };
  const mockAuthStore = {
    isLoggingOut: signal(false),
    logout: vi.fn(),
  };

  beforeEach(() => {
    mockUserStore.isLoading.set(false);
    mockUserStore.avatarUrl.set(null);
    mockUserStore.initials.set('FG');
    mockUserStore.displayName.set('Fireguard User');
    mockUserStore.profile.set({ email: 'user@fireguard.local' });
    mockAuthStore.isLoggingOut.set(false);
    mockAuthStore.logout.mockReset();

    TestBed.configureTestingModule({
      imports: [DashboardLayoutSidebarFooter],
      providers: [
        provideRouter([]),
        { provide: USER_IDENTITY_PORT, useValue: mockUserStore },
        { provide: AuthStore, useValue: mockAuthStore },
      ],
    });
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(DashboardLayoutSidebarFooter);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render user profile in sidebar footer', () => {
    const fixture = TestBed.createComponent(DashboardLayoutSidebarFooter);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('app-auth-user-profile'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('[data-testid="auth-user-profile"]'))).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Fireguard User');
  });
});

