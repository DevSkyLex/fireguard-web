import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { AuthStore } from '@core/stores/auth';
import { UserStore } from '@core/stores/user';
import { Panel } from 'primeng/panel';
import { DashboardLayoutUserProfile } from './dashboard-layout-user-profile.component';

describe('DashboardLayoutUserProfile', () => {
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
      imports: [DashboardLayoutUserProfile],
      providers: [
        provideRouter([]),
        { provide: UserStore, useValue: mockUserStore },
        { provide: AuthStore, useValue: mockAuthStore },
      ],
    });
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(DashboardLayoutUserProfile);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render user identity fallback details', () => {
    const fixture = TestBed.createComponent(DashboardLayoutUserProfile);
    fixture.detectChanges();

    const avatar = fixture.debugElement.query(By.css('p-avatar'));
    const textContent = fixture.nativeElement.textContent;
    expect(avatar).toBeTruthy();
    expect(textContent).toContain('FG');
    expect(textContent).toContain('Fireguard User');
    expect(textContent).toContain('user@fireguard.local');
  });

  it('should open user action menu upward when profile is clicked', () => {
    const fixture = TestBed.createComponent(DashboardLayoutUserProfile);
    fixture.detectChanges();

    const panelDebugElement = fixture.debugElement.query(By.directive(Panel));
    const panelInstance = panelDebugElement.componentInstance as Panel;
    expect(panelInstance.collapsed).toBe(true);

    const trigger = fixture.debugElement.query(By.css('[data-testid="dashboard-user-profile-trigger"]'));
    trigger.nativeElement.click();
    fixture.detectChanges();

    expect(panelInstance.collapsed).toBe(false);
    expect(fixture.debugElement.query(By.css('[data-testid="dashboard-user-profile-settings"]'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('[data-testid="dashboard-user-profile-logout"]'))).toBeTruthy();
  });

  it('should trigger logout from user action menu', () => {
    const fixture = TestBed.createComponent(DashboardLayoutUserProfile);
    fixture.detectChanges();

    const trigger = fixture.debugElement.query(By.css('[data-testid="dashboard-user-profile-trigger"]'));
    trigger.nativeElement.click();
    fixture.detectChanges();

    const logoutButton = fixture.debugElement.query(By.css('[data-testid="dashboard-user-profile-logout"]'));
    logoutButton.nativeElement.click();

    expect(mockAuthStore.logout).toHaveBeenCalledTimes(1);
  });

  it('should render avatar image when available', () => {
    mockUserStore.avatarUrl.set('https://example.com/avatar.png');
    const fixture = TestBed.createComponent(DashboardLayoutUserProfile);
    fixture.detectChanges();

    const avatarImage = fixture.debugElement.query(By.css('img'));
    expect(avatarImage).toBeTruthy();
  });

  it('should render skeletons while user profile is loading', () => {
    mockUserStore.isLoading.set(true);
    const fixture = TestBed.createComponent(DashboardLayoutUserProfile);
    fixture.detectChanges();

    const skeletonState = fixture.debugElement.query(By.css('[data-testid="dashboard-user-profile-skeleton"]'));
    const skeletons = fixture.debugElement.queryAll(By.css('p-skeleton'));
    const avatar = fixture.debugElement.query(By.css('p-avatar'));

    expect(skeletonState).toBeTruthy();
    expect(skeletons.length).toBe(3);
    expect(avatar).toBeFalsy();
  });
});
