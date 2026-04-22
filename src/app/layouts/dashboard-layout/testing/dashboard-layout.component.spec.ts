import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { DASHBOARD_SECONDARY_SIDEBAR_CONTRIBUTION } from '@core/ports/dashboard-secondary-sidebar';
import { NOTIFICATION_CENTER_PORT, USER_IDENTITY_PORT } from '@features/account/ports';
import { AUTH_LOGOUT_PORT } from '@features/auth';
import { ORGANIZATION_CONTEXT_PORT, ORGANIZATION_MEMBER_ACCESS_PORT } from '@features/organization/ports';
import { DashboardLayoutHeader } from '../components';
import { DashboardLayout } from '../dashboard-layout.component';
import { DashboardSidebarService } from '../services';

const MOCK_ORG = {
  id: 'org-1',
  name: 'Acme Corp',
  slug: 'acme',
  isActive: true,
  status: 'active',
  ownerUserId: 'u1',
  createdByUserId: 'u1',
  createdAt: '2025-01-01',
  updatedAt: '2025-01-01',
};

@Component({ template: '' })
class ContributionStub {}

type PointerEventOptions = {
  readonly pointerId?: number;
  readonly clientX?: number;
  readonly pointerType?: string;
  readonly button?: number;
};

const createPointerEvent = (type: string, options: PointerEventOptions = {}): Event => {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperties(event, {
    pointerId: { value: options.pointerId ?? 1 },
    clientX: { value: options.clientX ?? 0 },
    pointerType: { value: options.pointerType ?? 'mouse' },
    button: { value: options.button ?? 0 },
  });

  return event;
};

const dispatchPointerEvent = (
  target: EventTarget,
  type: string,
  options: PointerEventOptions = {},
): Event => {
  const event = createPointerEvent(type, options);
  target.dispatchEvent(event);
  return event;
};

const dispatchKeydown = (target: EventTarget, key: string, shiftKey: boolean = false): boolean => {
  const event = new KeyboardEvent('keydown', {
    key,
    shiftKey,
    bubbles: true,
    cancelable: true,
  });

  return target.dispatchEvent(event);
};

const getResizeHandle = (fixture: ComponentFixture<DashboardLayout>): HTMLButtonElement => {
  const debugElement = fixture.debugElement.query(By.css('button[aria-label="Resize sidebar"]'));
  return debugElement.nativeElement as HTMLButtonElement;
};

const getSidebar = (fixture: ComponentFixture<DashboardLayout>): HTMLElement => {
  // Find the sidebar that owns the resize handle (the secondary sidebar).
  const handle = getResizeHandle(fixture);
  return handle.closest('aside') as HTMLElement;
};

const mockPointerCapture = (handle: HTMLButtonElement): ReturnType<typeof vi.fn> => {
  const spy = vi.fn();
  Object.defineProperty(handle, 'setPointerCapture', {
    configurable: true,
    value: spy,
  });

  return spy;
};

const createDomRect = (left: number): DOMRect => new DOMRect(left, 0, 0, 0);

describe('DashboardLayout', () => {
  const mockUserStore = {
    isLoading: signal(false),
    avatarUrl: signal<string | null>(null),
    initials: signal<string | null>('FG'),
    displayName: signal<string | null>('Fireguard User'),
    profile: signal<{ email?: string } | null>({ email: 'user@fireguard.local' }),
  };
  const mockNotificationCenterPort = {
    unreadCount: signal(0),
    hasUnread: signal(false),
    initialize: vi.fn().mockResolvedValue(undefined),
    load: vi.fn(),
    connectMercure: vi.fn(),
  };
  const mockAuthLogoutPort = {
    isLoggingOut: signal(false),
    logout: vi.fn(),
  };
  const mockOrganizationStore = {
    selectedOrganization: signal<(typeof MOCK_ORG) | null>(MOCK_ORG),
    organizations: signal([MOCK_ORG]),
    isLoadingOrganizations: signal(false),
    isLoadingOrganization: signal(false),
    setOrganization: vi.fn(),
    loadOrganizations: vi.fn(),
  };
  const mockOrganizationMemberAccess = {
    profile: signal(null),
    roles: signal<ReadonlyArray<string>>([]),
    permissions: signal<ReadonlyArray<string>>([]),
    isLoadingAccess: signal(false),
    accessError: signal(null),
    reload: vi.fn(),
    clear: vi.fn(),
  };

  const contributionIsActive = signal(true);
  const mockContribution = {
    id: 'test',
    priority: 10,
    component: ContributionStub,
    isActive: contributionIsActive,
  };

  beforeEach(() => {
    mockAuthLogoutPort.isLoggingOut.set(false);
    mockAuthLogoutPort.logout.mockReset();
    mockNotificationCenterPort.initialize.mockReset();
    mockNotificationCenterPort.initialize.mockResolvedValue(undefined);
    mockNotificationCenterPort.connectMercure.mockReset();
    mockOrganizationStore.selectedOrganization.set(MOCK_ORG);
    contributionIsActive.set(true);

    TestBed.configureTestingModule({
      imports: [DashboardLayout],
      providers: [
        provideRouter([]),
        { provide: USER_IDENTITY_PORT, useValue: mockUserStore },
        { provide: NOTIFICATION_CENTER_PORT, useValue: mockNotificationCenterPort },
        { provide: AUTH_LOGOUT_PORT, useValue: mockAuthLogoutPort },
        { provide: ORGANIZATION_CONTEXT_PORT, useValue: mockOrganizationStore },
        { provide: ORGANIZATION_MEMBER_ACCESS_PORT, useValue: mockOrganizationMemberAccess },
        { provide: DASHBOARD_SECONDARY_SIDEBAR_CONTRIBUTION, useValue: mockContribution, multi: true },
      ],
    }).overrideComponent(DashboardLayoutHeader, {
      set: {
        imports: [],
        template: '<div data-testid="dashboard-layout-header-stub"></div>',
      },
    });
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(DashboardLayout);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the secondary sidebar when a contribution is active', () => {
    contributionIsActive.set(true);

    const fixture = TestBed.createComponent(DashboardLayout);
    fixture.detectChanges();

    expect(
      fixture.debugElement.query(By.css('app-dashboard-layout-secondary-sidebar')),
    ).toBeTruthy();
  });

  it('should not render the secondary sidebar when no contribution is active', () => {
    contributionIsActive.set(false);

    const fixture = TestBed.createComponent(DashboardLayout);
    fixture.detectChanges();

    expect(
      fixture.debugElement.query(By.css('app-dashboard-layout-secondary-sidebar')),
    ).toBeFalsy();
  });

  it('should initialize notifications and connect Mercure when a profile is available', () => {
    const fixture = TestBed.createComponent(DashboardLayout);
    fixture.detectChanges();

    expect(mockNotificationCenterPort.initialize).toHaveBeenCalledTimes(1);
    expect(mockNotificationCenterPort.connectMercure).toHaveBeenCalledTimes(1);
  });

  it('should render an accessible desktop resize handle', () => {
    const fixture = TestBed.createComponent(DashboardLayout);
    fixture.detectChanges();

    const handle = getResizeHandle(fixture);
    expect(handle.getAttribute('role')).toBe('separator');
    expect(handle.getAttribute('aria-orientation')).toBe('vertical');
  });

  it('should resize sidebar from pointer move and cleanup on pointerup', () => {
    const fixture = TestBed.createComponent(DashboardLayout);
    const sidebarService = fixture.debugElement.injector.get(DashboardSidebarService);
    const setWidthSpy = vi.spyOn(sidebarService, 'setWidth');

    fixture.detectChanges();
    const handle = getResizeHandle(fixture);
    const aside = getSidebar(fixture);
    const captureSpy = mockPointerCapture(handle);
    vi.spyOn(aside, 'getBoundingClientRect').mockReturnValue(createDomRect(100));

    dispatchPointerEvent(handle, 'pointerdown', { pointerId: 7, pointerType: 'mouse', button: 0 });
    expect(captureSpy).toHaveBeenCalledWith(7);
    expect(document.body.style.cursor).toBe('col-resize');
    expect(document.body.style.userSelect).toBe('none');

    dispatchPointerEvent(document, 'pointermove', { pointerId: 7, clientX: 352 });
    expect(setWidthSpy).toHaveBeenCalledWith(252);

    dispatchPointerEvent(document, 'pointerup', { pointerId: 7 });
    expect(document.body.style.cursor).toBe('');
    expect(document.body.style.userSelect).toBe('');
  });

  it('should recalculate sidebar left offset on each pointer move', () => {
    const fixture = TestBed.createComponent(DashboardLayout);
    const sidebarService = fixture.debugElement.injector.get(DashboardSidebarService);
    const setWidthSpy = vi.spyOn(sidebarService, 'setWidth');

    fixture.detectChanges();
    const handle = getResizeHandle(fixture);
    const aside = getSidebar(fixture);
    mockPointerCapture(handle);
    vi.spyOn(aside, 'getBoundingClientRect')
      .mockReturnValueOnce(createDomRect(100))
      .mockReturnValueOnce(createDomRect(140));

    dispatchPointerEvent(handle, 'pointerdown', { pointerId: 21, pointerType: 'mouse', button: 0 });
    dispatchPointerEvent(document, 'pointermove', { pointerId: 21, clientX: 360 });
    dispatchPointerEvent(document, 'pointermove', { pointerId: 21, clientX: 360 });

    expect(setWidthSpy).toHaveBeenNthCalledWith(1, 260);
    expect(setWidthSpy).toHaveBeenNthCalledWith(2, 220);
  });

  it('should resize sidebar with keyboard arrows and home/end', () => {
    const fixture = TestBed.createComponent(DashboardLayout);
    const sidebarService = fixture.debugElement.injector.get(DashboardSidebarService);

    fixture.detectChanges();
    const handle = getResizeHandle(fixture);
    sidebarService.setWidth(320);

    const leftHandled = dispatchKeydown(handle, 'ArrowLeft');
    expect(leftHandled).toBe(false);
    expect(sidebarService.width()).toBe(304);

    const rightHandled = dispatchKeydown(handle, 'ArrowRight', true);
    expect(rightHandled).toBe(false);
    expect(sidebarService.width()).toBe(336);

    const homeHandled = dispatchKeydown(handle, 'Home');
    expect(homeHandled).toBe(false);
    expect(sidebarService.width()).toBe(sidebarService.minWidth());

    const endHandled = dispatchKeydown(handle, 'End');
    expect(endHandled).toBe(false);
    expect(sidebarService.width()).toBe(sidebarService.maxWidth());
  });

  it('should cleanup on pointercancel', () => {
    const fixture = TestBed.createComponent(DashboardLayout);
    const sidebarService = fixture.debugElement.injector.get(DashboardSidebarService);
    const setWidthSpy = vi.spyOn(sidebarService, 'setWidth');

    fixture.detectChanges();
    const handle = getResizeHandle(fixture);
    mockPointerCapture(handle);

    dispatchPointerEvent(handle, 'pointerdown', { pointerId: 11, pointerType: 'mouse', button: 0 });
    dispatchPointerEvent(document, 'pointercancel', { pointerId: 11 });
    dispatchPointerEvent(document, 'pointermove', { pointerId: 11, clientX: 450 });

    expect(setWidthSpy).not.toHaveBeenCalled();
    expect(document.body.style.cursor).toBe('');
    expect(document.body.style.userSelect).toBe('');
  });

  it('should cleanup on window blur', () => {
    const fixture = TestBed.createComponent(DashboardLayout);
    const sidebarService = fixture.debugElement.injector.get(DashboardSidebarService);
    const setWidthSpy = vi.spyOn(sidebarService, 'setWidth');

    fixture.detectChanges();
    const handle = getResizeHandle(fixture);
    mockPointerCapture(handle);

    dispatchPointerEvent(handle, 'pointerdown', { pointerId: 13, pointerType: 'mouse', button: 0 });
    window.dispatchEvent(new Event('blur'));
    dispatchPointerEvent(document, 'pointermove', { pointerId: 13, clientX: 450 });

    expect(setWidthSpy).not.toHaveBeenCalled();
    expect(document.body.style.cursor).toBe('');
    expect(document.body.style.userSelect).toBe('');
  });

  it('should ignore non-resize keys', () => {
    const fixture = TestBed.createComponent(DashboardLayout);
    const sidebarService = fixture.debugElement.injector.get(DashboardSidebarService);
    const adjustWidthSpy = vi.spyOn(sidebarService, 'adjustWidth');
    const setWidthSpy = vi.spyOn(sidebarService, 'setWidth');

    fixture.detectChanges();
    const handle = getResizeHandle(fixture);

    const handled = dispatchKeydown(handle, 'Enter');
    expect(handled).toBe(true);
    expect(adjustWidthSpy).not.toHaveBeenCalled();
    expect(setWidthSpy).not.toHaveBeenCalled();
  });

  it('should stop resizing listeners when component is destroyed', () => {
    const fixture = TestBed.createComponent(DashboardLayout);
    const sidebarService = fixture.debugElement.injector.get(DashboardSidebarService);
    const setWidthSpy = vi.spyOn(sidebarService, 'setWidth');

    fixture.detectChanges();
    const handle = getResizeHandle(fixture);
    mockPointerCapture(handle);

    dispatchPointerEvent(handle, 'pointerdown', { pointerId: 9, pointerType: 'mouse', button: 0 });
    fixture.destroy();
    dispatchPointerEvent(document, 'pointermove', { pointerId: 9, clientX: 400 });

    expect(setWidthSpy).not.toHaveBeenCalled();
    expect(document.body.style.cursor).toBe('');
    expect(document.body.style.userSelect).toBe('');
  });
});
