import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { AuthStore } from '@core/stores/auth';
import { UserStore } from '@core/stores/user';
import { OrganizationStore } from '@core/stores/organization';
import { DashboardLayout } from './dashboard-layout.component';
import { DashboardSidebarService } from './services';

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

const dispatchKeydown = (
  target: EventTarget,
  key: string,
  shiftKey: boolean = false,
): boolean => {
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
  const debugElement = fixture.debugElement.query(By.css('aside'));
  return debugElement.nativeElement as HTMLElement;
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
  const mockAuthStore = {
    isLoggingOut: signal(false),
    logout: vi.fn(),
  };
  const mockOrganizationStore = {
    selectedOrganization: signal(null),
    organizations: signal([]),
    isLoadingOrganizations: signal(false),
    setOrganization: vi.fn(),
    loadOrganizations: vi.fn(),
  };

  beforeEach(() => {
    mockAuthStore.isLoggingOut.set(false);
    mockAuthStore.logout.mockReset();
    mockOrganizationStore.setOrganization.mockReset();
    mockOrganizationStore.loadOrganizations.mockReset();

    TestBed.configureTestingModule({
      imports: [DashboardLayout],
      providers: [
        provideRouter([]),
        { provide: UserStore, useValue: mockUserStore },
        { provide: AuthStore, useValue: mockAuthStore },
        { provide: OrganizationStore, useValue: mockOrganizationStore },
      ],
    });
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(DashboardLayout);
    expect(fixture.componentInstance).toBeTruthy();
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
