import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CookieService } from '@core/cookie';
import { ThemeService } from '../theme.service';

/**
 * Function installViewTransitions
 * @description Controls snapshot updates and completion independently to exercise interrupted choices.
 * @access private
 * @since 1.4.0
 * @returns {object} The native API spy and queued transitions.
 */
function installViewTransitions() {
  const pending: {
    view: ViewTransition;
    update: ViewTransitionUpdateCallback;
    finish: () => void;
    fail: (reason: Error) => void;
  }[] = [];
  const start = vi.fn((update: ViewTransitionUpdateCallback): ViewTransition => {
    let finish: () => void = vi.fn();
    let fail: (reason: Error) => void = vi.fn();
    const finished = new Promise<void>((resolve, reject) => {
      finish = resolve;
      fail = reject;
    });
    const view: ViewTransition = {
      ready: Promise.resolve(),
      updateCallbackDone: Promise.resolve(),
      finished,
      types: new Set<string>(),
      skipTransition: vi.fn(),
    };
    pending.push({ view, update, finish, fail });
    return view;
  });
  Object.defineProperty(document, 'startViewTransition', {
    configurable: true,
    value: start,
  });
  return { start, pending };
}

describe('ThemeService', () => {
  let service: ThemeService;
  const originalTransition = Object.getOwnPropertyDescriptor(document, 'startViewTransition');
  const originalMatchMedia = Object.getOwnPropertyDescriptor(window, 'matchMedia');
  const cookies = { getCookie: vi.fn(() => 'light'), setCookie: vi.fn() };

  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    TestBed.configureTestingModule({
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: CookieService, useValue: cookies },
      ],
    });
    service = TestBed.inject(ThemeService);
    TestBed.tick();
    cookies.setCookie.mockClear();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    if (originalTransition) {
      Object.defineProperty(document, 'startViewTransition', originalTransition);
    } else {
      Reflect.deleteProperty(document, 'startViewTransition');
    }
    if (originalMatchMedia) {
      Object.defineProperty(window, 'matchMedia', originalMatchMedia);
    } else {
      Reflect.deleteProperty(window, 'matchMedia');
    }
    document.documentElement.removeAttribute('data-theme');
    vi.restoreAllMocks();
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  it('should apply and persist immediately when view transitions are unavailable', () => {
    service.setTheme('dark');
    TestBed.tick();

    expect(service.theme()).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(document.documentElement.hasAttribute('data-theme-transition')).toBe(false);
    expect(cookies.setCookie).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'theme-preference', value: 'dark' }),
    );
  });

  it('should update the preference and DOM inside the snapshot callback and release styles on finish', async () => {
    const { start, pending } = installViewTransitions();
    service.setTheme('dark');

    expect(start).toHaveBeenCalledOnce();
    expect(service.theme()).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(document.documentElement.getAttribute('data-theme-transition')).toBe('circle-blur');

    const rendered = pending[0].update();
    TestBed.tick();
    await rendered;

    expect(service.theme()).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(cookies.setCookie).toHaveBeenCalledWith(expect.objectContaining({ value: 'dark' }));
    pending[0].finish();
    await pending[0].view.finished;
    expect(document.documentElement.hasAttribute('data-theme-transition')).toBe(false);
  });

  it('should respect reduced motion even when the browser supports transitions', () => {
    const { start } = installViewTransitions();
    vi.mocked(window.matchMedia).mockReturnValue({ matches: true } as MediaQueryList);

    service.setTheme('dark');

    expect(start).not.toHaveBeenCalled();
    expect(service.theme()).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('should persist system mode without animating when its appearance is already applied', () => {
    const { start } = installViewTransitions();
    service.setTheme('system');
    TestBed.tick();

    expect(start).not.toHaveBeenCalled();
    expect(service.theme()).toBe('system');
    expect(service.resolvedTheme()).toBe('light');
    expect(cookies.setCookie).toHaveBeenCalledWith(expect.objectContaining({ value: 'system' }));
  });

  it('should prevent a skipped callback from replacing the latest choice', async () => {
    const { pending } = installViewTransitions();
    service.setTheme('dark');
    service.setTheme('system');
    await pending[0].update();
    TestBed.tick();
    pending[0].finish();
    await pending[0].view.finished;

    expect(pending[0].view.skipTransition).toHaveBeenCalledOnce();
    expect(service.theme()).toBe('system');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(document.documentElement.hasAttribute('data-theme-transition')).toBe(false);
  });

  it('should keep a newer animation scoped when the interrupted one finishes', async () => {
    const { pending } = installViewTransitions();
    service.setTheme('dark');
    const darkRendered = pending[0].update();
    TestBed.tick();
    await darkRendered;

    service.setTheme('light');
    pending[0].finish();
    await pending[0].view.finished;
    expect(document.documentElement.getAttribute('data-theme-transition')).toBe('circle-blur');

    const lightRendered = pending[1].update();
    TestBed.tick();
    await lightRendered;
    pending[1].finish();
    await pending[1].view.finished;

    expect(service.theme()).toBe('light');
    expect(document.documentElement.hasAttribute('data-theme-transition')).toBe(false);
  });

  it('should keep theme selection usable when starting a transition fails', () => {
    const { start } = installViewTransitions();
    start.mockImplementation(() => {
      throw new Error('Snapshots unavailable');
    });
    service.setTheme('dark');
    TestBed.tick();

    expect(service.theme()).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(document.documentElement.hasAttribute('data-theme-transition')).toBe(false);
    expect(cookies.setCookie).toHaveBeenCalledWith(expect.objectContaining({ value: 'dark' }));
  });

  it('should release animation styles after the native transition rejects', async () => {
    const { pending } = installViewTransitions();
    service.setTheme('dark');
    const rendered = pending[0].update();
    TestBed.tick();
    await rendered;
    pending[0].fail(new Error('Transition interrupted'));
    await pending[0].view.finished.catch(() => undefined);

    expect(service.theme()).toBe('dark');
    expect(document.documentElement.hasAttribute('data-theme-transition')).toBe(false);
  });

  it('should apply the requested theme during SSR without a browser animation', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: PLATFORM_ID, useValue: 'server' },
        { provide: CookieService, useValue: cookies },
      ],
    });
    const { start } = installViewTransitions();
    const serverService = TestBed.inject(ThemeService);
    serverService.setTheme('dark');
    TestBed.tick();

    expect(start).not.toHaveBeenCalled();
    expect(serverService.theme()).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(cookies.setCookie).not.toHaveBeenCalled();
  });

  it('should keep marked logos and the favicon on the primary variant', () => {
    const logo: HTMLImageElement = document.createElement('img');
    logo.setAttribute('data-theme-logo', '');
    document.body.appendChild(logo);

    const onboardingLogo: HTMLImageElement = document.createElement('img');
    onboardingLogo.setAttribute('data-theme-logo', 'onboarding');
    document.body.appendChild(onboardingLogo);

    const icon: HTMLLinkElement = document.createElement('link');
    icon.setAttribute('data-theme-icon', '');
    document.head.appendChild(icon);

    service.setTheme('dark');
    TestBed.tick();

    expect(logo.getAttribute('src')).toBe('fireguard-logo-primary.svg');
    expect(onboardingLogo.getAttribute('src')).toBe('fireguard-logo-primary.svg');
    expect(icon.getAttribute('href')).toBe('fireguard-logo-primary.svg');

    service.setTheme('light');
    TestBed.tick();

    expect(logo.getAttribute('src')).toBe('fireguard-logo-primary.svg');
    expect(onboardingLogo.getAttribute('src')).toBe('fireguard-logo-primary.svg');
    expect(icon.getAttribute('href')).toBe('fireguard-logo-primary.svg');

    logo.remove();
    onboardingLogo.remove();
    icon.remove();
  });
});
