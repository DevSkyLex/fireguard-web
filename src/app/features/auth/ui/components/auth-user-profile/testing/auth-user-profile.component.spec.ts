import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { Panel } from 'primeng/panel';
import { USER_IDENTITY_PORT } from '@features/account/ports';
import { AuthStore } from '@features/auth/state';
import { installMatchMediaMock } from '@shared/testing/match-media.mock';
import { AuthUserProfile } from '../auth-user-profile.component';

describe('AuthUserProfile', () => {
  const mockUserStore = {
    isLoading: signal(false),
    avatarUrl: signal<string | null>(null),
    avatarUrlSmall: signal<string | null>(null),
    initials: signal<string | null>('FG'),
    displayName: signal<string | null>('Fireguard User'),
    profile: signal<{ email?: string } | null>({ email: 'user@fireguard.local' }),
  };
  const mockAuthStore = {
    isLoggingOut: signal(false),
    logout: vi.fn(),
  };

  beforeEach(() => {
    installMatchMediaMock();
    mockUserStore.isLoading.set(false);
    mockUserStore.avatarUrl.set(null);
    mockUserStore.avatarUrlSmall.set(null);
    mockUserStore.initials.set('FG');
    mockUserStore.displayName.set('Fireguard User');
    mockUserStore.profile.set({ email: 'user@fireguard.local' });
    mockAuthStore.isLoggingOut.set(false);
    mockAuthStore.logout.mockReset();

    TestBed.configureTestingModule({
      imports: [AuthUserProfile],
      providers: [
        provideRouter([]),
        { provide: USER_IDENTITY_PORT, useValue: mockUserStore },
        { provide: AuthStore, useValue: mockAuthStore },
      ],
    });
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(AuthUserProfile);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render user identity fallback details', () => {
    const fixture = TestBed.createComponent(AuthUserProfile);
    fixture.detectChanges();

    const avatar = fixture.debugElement.query(By.css('p-avatar'));
    const textContent = fixture.nativeElement.textContent;
    expect(avatar).toBeTruthy();
    expect(textContent).toContain('FG');
    expect(textContent).toContain('Fireguard User');
    expect(textContent).toContain('user@fireguard.local');
  });

  it('should open user action menu upward when profile is clicked', () => {
    const fixture = TestBed.createComponent(AuthUserProfile);
    fixture.detectChanges();

    const panelDebugElement = fixture.debugElement.query(By.directive(Panel));
    const panelInstance = panelDebugElement.componentInstance as Panel;
    expect(panelInstance.collapsed).toBe(true);

    const trigger = fixture.debugElement.query(By.css('[data-testid="auth-user-profile-trigger"]'));
    trigger.nativeElement.click();
    fixture.detectChanges();

    expect(panelInstance.collapsed).toBe(false);
    expect(
      fixture.debugElement.query(By.css('[data-testid="auth-user-profile-settings"]')),
    ).toBeTruthy();
    expect(
      fixture.debugElement.query(By.css('[data-testid="auth-user-profile-logout"]')),
    ).toBeTruthy();
  });

  it('should trigger logout from user action menu', () => {
    const fixture = TestBed.createComponent(AuthUserProfile);
    fixture.detectChanges();

    const trigger = fixture.debugElement.query(By.css('[data-testid="auth-user-profile-trigger"]'));
    trigger.nativeElement.click();
    fixture.detectChanges();

    const logoutButton = fixture.debugElement.query(
      By.css('[data-testid="auth-user-profile-logout"]'),
    );
    logoutButton.nativeElement.click();

    expect(mockAuthStore.logout).toHaveBeenCalledTimes(1);
  });

  it('should render avatar image when available', () => {
    mockUserStore.avatarUrlSmall.set('https://example.com/avatar.png');
    const fixture = TestBed.createComponent(AuthUserProfile);
    fixture.detectChanges();

    const avatarImage = fixture.debugElement.query(By.css('img'));
    expect(avatarImage).toBeTruthy();
  });

  it('should render skeletons while user profile is loading', () => {
    mockUserStore.isLoading.set(true);
    const fixture = TestBed.createComponent(AuthUserProfile);
    fixture.detectChanges();

    const skeletonState = fixture.debugElement.query(
      By.css('[data-testid="auth-user-profile-skeleton"]'),
    );
    const skeletons = fixture.debugElement.queryAll(By.css('p-skeleton'));
    const avatar = fixture.debugElement.query(By.css('p-avatar'));

    expect(skeletonState).toBeTruthy();
    expect(skeletons.length).toBe(3);
    expect(avatar).toBeFalsy();
  });
});
