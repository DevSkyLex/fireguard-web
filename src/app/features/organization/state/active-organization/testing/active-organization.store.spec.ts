import { TestBed } from '@angular/core/testing';
import { NavigationEnd, Router } from '@angular/router';
import { Dispatcher } from '@ngrx/signals/events';
import { of, Subject, throwError } from 'rxjs';
import type { ApiError } from '@core/api/models';
import { CookieService } from '@core/cookie';
import { LAST_ORGANIZATION_COOKIE_NAME } from '@features/organization/constants';
import { OrganizationService } from '@features/organization/data-access';
import type { OrganizationOutput } from '@features/organization/models';
import { ActiveOrganizationStore } from '../active-organization.store';

const flushEffects = async (): Promise<void> => {
  const testBedWithFlush = TestBed as typeof TestBed & {
    flushEffects?: () => void;
  };

  testBedWithFlush.flushEffects?.();
  await Promise.resolve();
};

/**
 * A router whose deepest snapshot carries `:organizationId`, mirroring the
 * shape the store walks. `events` stays open so a test can push a navigation
 * and move the URL from one organization to another.
 */
function routerStub(organizationId: string | null, events: Subject<unknown>) {
  const child = {
    paramMap: {
      get: (key: string): string | null => (key === 'organizationId' ? organizationId : null),
    },
    children: [],
  };

  return {
    events,
    routerState: {
      snapshot: {
        root: {
          paramMap: { get: (): string | null => null },
          children: organizationId === null ? [] : [child],
        },
      },
    },
  };
}

describe('ActiveOrganizationStore', () => {
  let store: ActiveOrganizationStore;
  let events: Subject<unknown>;
  let mockDispatcher: { dispatch: ReturnType<typeof vi.fn> };
  let mockOrganizationService: {
    get: ReturnType<typeof vi.fn>;
  };
  let mockCookieService: {
    getCookie: ReturnType<typeof vi.fn>;
    setCookie: ReturnType<typeof vi.fn>;
    deleteCookie: ReturnType<typeof vi.fn>;
  };
  let router: ReturnType<typeof routerStub>;

  const organization: OrganizationOutput = {
    '@id': '/api/organizations/org-1',
    '@type': 'Organization',
    id: 'org-1',
    name: 'Acme Corp',
    slug: 'acme',
    isActive: true,
    status: 'active',
    ownerUserId: 'user-1',
    createdByUserId: 'user-1',
    memberCount: 4,
    createdAt: '2026-03-01T00:00:00+00:00',
    updatedAt: '2026-03-30T00:00:00+00:00',
  };

  /**
   * Builds the store on a URL that names `organizationId`. The store reads the
   * router synchronously on init, so the URL has to be in place first.
   */
  function createStore(organizationId: string | null): ActiveOrganizationStore {
    events = new Subject<unknown>();
    router = routerStub(organizationId, events);

    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: router },
        { provide: Dispatcher, useValue: mockDispatcher },
        { provide: OrganizationService, useValue: mockOrganizationService },
        { provide: CookieService, useValue: mockCookieService },
      ],
    });

    return TestBed.inject(ActiveOrganizationStore);
  }

  /** Moves the URL to another organization, as a navigation would. */
  function navigateTo(organizationId: string | null): void {
    Object.assign(router.routerState, routerStub(organizationId, events).routerState);
    events.next(new NavigationEnd(1, '/', '/'));
  }

  beforeEach(() => {
    mockDispatcher = { dispatch: vi.fn() };
    mockOrganizationService = {
      get: vi.fn(),
    };
    mockCookieService = {
      getCookie: vi.fn().mockReturnValue(null),
      setCookie: vi.fn(),
      deleteCookie: vi.fn(),
    };
  });

  it('should create', () => {
    store = createStore(null);

    expect(store).toBeTruthy();
    expect(store.selectedOrganization()).toBeNull();
    expect(store.isLoadingOrganization()).toBe(false);
  });

  it('should read the active organization identifier from the URL', () => {
    store = createStore('org-1');

    expect(store.selectedOrganizationId()).toBe('org-1');
  });

  it('should expose the cached organization once the URL names it', () => {
    store = createStore('org-1');

    store.setOrganization(organization);

    expect(store.selectedOrganization()).toEqual(organization);
    expect(store.getCallState().status).toBe('success');
  });

  it('should hide a cached organization the URL no longer names', () => {
    store = createStore('org-1');
    store.setOrganization(organization);

    navigateTo('org-2');

    // The entity is still cached, but exposing it here would show the previous
    // organization's name in the rail until the new one resolves.
    expect(store.selectedOrganizationId()).toBe('org-2');
    expect(store.selectedOrganization()).toBeNull();
  });

  it('should keep the context when navigation leaves the organization scope', async () => {
    store = createStore('org-1');
    store.setOrganization(organization);
    await flushEffects();

    navigateTo(null);
    await flushEffects();

    expect(store.selectedOrganizationId()).toBe('org-1');
    expect(store.selectedOrganization()).toEqual(organization);
  });

  it('should open on the remembered organization before any navigation names one', () => {
    mockCookieService.getCookie.mockReturnValue('org-9');

    store = createStore(null);

    expect(store.selectedOrganizationId()).toBe('org-9');
  });

  it('should let the URL outrank the remembered organization', () => {
    mockCookieService.getCookie.mockReturnValue('org-9');

    store = createStore('org-1');

    expect(store.selectedOrganizationId()).toBe('org-1');
  });

  it('should resolve organization successfully', async () => {
    store = createStore('org-1');
    mockOrganizationService.get.mockReturnValue(of(organization));

    store.resolveOrganization('org-1').subscribe();
    await flushEffects();

    expect(mockOrganizationService.get).toHaveBeenCalledWith('org-1');
    expect(store.selectedOrganization()).toEqual(organization);
    expect(store.getCallState().status).toBe('success');
  });

  it('should dispatch failure when organization resolve fails', async () => {
    store = createStore('missing-org');
    const error: ApiError = {
      '@id': '',
      '@type': 'Error',
      status: 404,
      type: 'https://api.test.com/errors/not-found',
      title: 'Not Found',
      detail: 'Organization not found.',
    };
    mockOrganizationService.get.mockReturnValue(throwError(() => error));

    store.resolveOrganization('missing-org').subscribe({ error: () => undefined });
    await flushEffects();

    expect(store.getCallState().status).toBe('error');
    expect(mockDispatcher.dispatch).toHaveBeenCalledTimes(1);
  });

  it('should persist the routed organization id as the last-organization cookie', async () => {
    store = createStore('org-1');
    await flushEffects();

    expect(mockCookieService.setCookie).toHaveBeenCalledTimes(1);
    expect(mockCookieService.setCookie).toHaveBeenCalledWith(
      expect.objectContaining({
        name: LAST_ORGANIZATION_COOKIE_NAME,
        value: organization.id,
        path: '/',
        sameSite: 'Lax',
      }),
    );

    const setCookieOptions = mockCookieService.setCookie.mock.calls[0]?.[0] as {
      maxAge?: number;
    };
    expect(setCookieOptions.maxAge).toBeGreaterThan(0);
  });

  it('should keep the last-organization cookie untouched when leaving the scope', async () => {
    store = createStore('org-1');
    await flushEffects();

    expect(mockCookieService.setCookie).toHaveBeenCalledTimes(1);

    navigateTo(null);
    await flushEffects();

    expect(store.selectedOrganization()).toBeNull();
    expect(mockCookieService.deleteCookie).not.toHaveBeenCalled();
    expect(mockCookieService.setCookie).toHaveBeenCalledTimes(1);
  });
});
