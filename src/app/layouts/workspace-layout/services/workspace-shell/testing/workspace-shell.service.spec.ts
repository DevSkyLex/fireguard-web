import { TestBed } from '@angular/core/testing';
import { CookieService } from '@core/cookie';
import type { CookieOptions } from '@core/cookie';
import { WORKSPACE_PANEL_COOKIE_NAME, WORKSPACE_SIDEBAR_COOKIE_NAME } from '../constants';
import { WorkspaceShellService } from '../workspace-shell.service';

class CookieServiceStub {
  public readonly store = new Map<string, string>();

  public getCookie<T>(name: string): T | null {
    return (this.store.get(name) as T) ?? null;
  }

  public setCookie<T>(options: CookieOptions<T>): void {
    this.store.set(options.name, String(options.value));
  }
}

function configure(seed: Record<string, string> = {}): {
  service: WorkspaceShellService;
  cookies: CookieServiceStub;
} {
  const cookies = new CookieServiceStub();
  Object.entries(seed).forEach(([name, value]: [string, string]) => cookies.store.set(name, value));

  TestBed.configureTestingModule({
    providers: [WorkspaceShellService, { provide: CookieService, useValue: cookies }],
  });

  return { service: TestBed.inject(WorkspaceShellService), cookies };
}

describe('WorkspaceShellService', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('should open the panel and expand the sidebar by default', () => {
    const { service } = configure();

    expect(service.panelVisible()).toBe(true);
    expect(service.sidebarCollapsed()).toBe(false);
    expect(service.mobilePane()).toBe('list');
  });

  it('should restore persisted preferences', () => {
    const { service } = configure({
      [WORKSPACE_PANEL_COOKIE_NAME]: '0',
      [WORKSPACE_SIDEBAR_COOKIE_NAME]: '1',
    });

    expect(service.panelVisible()).toBe(false);
    expect(service.sidebarCollapsed()).toBe(true);
  });

  it('should ignore a malformed cookie and keep the default', () => {
    const { service } = configure({ [WORKSPACE_PANEL_COOKIE_NAME]: 'yes' });

    expect(service.panelVisible()).toBe(true);
  });

  it('should persist the panel preference when toggled', () => {
    const { service, cookies } = configure();

    service.togglePanel();

    expect(service.panelVisible()).toBe(false);
    expect(cookies.store.get(WORKSPACE_PANEL_COOKIE_NAME)).toBe('0');
  });

  it('should persist the sidebar preference when toggled', () => {
    const { service, cookies } = configure();

    service.toggleSidebarCollapsed();

    expect(service.sidebarCollapsed()).toBe(true);
    expect(cookies.store.get(WORKSPACE_SIDEBAR_COOKIE_NAME)).toBe('1');
  });

  it('should close the panel when switching to the main pane below the desktop breakpoint', () => {
    // jsdom reports no matching media query, so `isDesktop()` stays false.
    const { service } = configure();

    service.showMain();

    expect(service.mobilePane()).toBe('main');
    expect(service.panelVisible()).toBe(false);
  });

  it('should not persist the panel closing caused by mobile navigation', () => {
    const { service, cookies } = configure();

    service.showMain();

    // The user never expressed a preference here, so the cookie stays untouched
    // and the panel reopens on the next desktop visit.
    expect(cookies.store.has(WORKSPACE_PANEL_COOKIE_NAME)).toBe(false);
  });

  it('should return to the list pane', () => {
    const { service } = configure();

    service.showMain();
    service.showList();

    expect(service.mobilePane()).toBe('list');
  });
});
