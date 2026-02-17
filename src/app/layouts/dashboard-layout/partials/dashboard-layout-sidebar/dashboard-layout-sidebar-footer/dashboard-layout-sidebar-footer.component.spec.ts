import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { AuthStore } from '@core/stores/auth';
import { UserStore } from '@core/stores/user';
import { DashboardLayoutSidebarFooter } from './dashboard-layout-sidebar-footer.component';

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
        { provide: UserStore, useValue: mockUserStore },
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

    expect(fixture.debugElement.query(By.css('app-dashboard-layout-user-profile'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('[data-testid="dashboard-user-profile"]'))).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Fireguard User');
  });
});
