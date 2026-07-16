import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Dispatcher } from '@ngrx/signals/events';
import { of, throwError } from 'rxjs';
import type { ApiError } from '@core/api/models';
import { CookieService } from '@core/cookie';
import { LAST_ORGANIZATION_COOKIE_NAME } from '@features/organization/constants';
import { OrganizationService } from '@features/organization/data-access';
import type { OrganizationOutput } from '@features/organization/models';
import { ActiveOrganizationStore } from '../active-organization.store';

const _flushEffects = async (): Promise<void> => {
  const testBedWithFlush = TestBed as typeof TestBed & {
    flushEffects?: () => void;
  };

  testBedWithFlush.flushEffects?.();
  await Promise.resolve();
};

describe('ActiveOrganizationStore', () => {
  let _store: ActiveOrganizationStore;
  let mockDispatcher: { dispatch: ReturnType<typeof vi.fn> };
  let mockOrganizationService: {
    get: ReturnType<typeof vi.fn>;
  };
  let mockCookieService: {
    getCookie: ReturnType<typeof vi.fn>;
    setCookie: ReturnType<typeof vi.fn>;
    deleteCookie: ReturnType<typeof vi.fn>;
  };

  const _organization: OrganizationOutput = {
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

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: Dispatcher, useValue: mockDispatcher },
        { provide: OrganizationService, useValue: mockOrganizationService },
        { provide: CookieService, useValue: mockCookieService },
      ],
    });

    _store = TestBed.inject(ActiveOrganizationStore);
  });

  it('should create', () => {
    expect(_store).toBeTruthy();
    expect(_store.selectedOrganization()).toBeNull();
    expect(_store.isLoadingOrganization()).toBe(false);
  });

  it('should set organization locally', () => {
    _store.setOrganization(_organization);

    expect(_store.selectedOrganization()).toEqual(_organization);
    expect(_store.getCallState().status).toBe('success');
  });

  it('should resolve organization successfully', async () => {
    mockOrganizationService.get.mockReturnValue(of(_organization));

    _store.resolveOrganization('org-1').subscribe();
    await _flushEffects();

    expect(mockOrganizationService.get).toHaveBeenCalledWith('org-1');
    expect(_store.selectedOrganization()).toEqual(_organization);
    expect(_store.getCallState().status).toBe('success');
  });

  it('should dispatch failure when organization resolve fails', async () => {
    const error: ApiError = {
      '@id': '',
      '@type': 'Error',
      status: 404,
      type: 'https://api.test.com/errors/not-found',
      title: 'Not Found',
      detail: 'Organization not found.',
      instance: null,
    };
    mockOrganizationService.get.mockReturnValue(throwError(() => error));

    _store.resolveOrganization('missing-org').subscribe({ error: () => undefined });
    await _flushEffects();

    expect(_store.getCallState().status).toBe('error');
    expect(mockDispatcher.dispatch).toHaveBeenCalledTimes(1);
  });

  it('should persist the selected organization id as the last-organization cookie', async () => {
    _store.setOrganization(_organization);
    await _flushEffects();

    expect(mockCookieService.setCookie).toHaveBeenCalledTimes(1);
    expect(mockCookieService.setCookie).toHaveBeenCalledWith(
      expect.objectContaining({
        name: LAST_ORGANIZATION_COOKIE_NAME,
        value: _organization.id,
        path: '/',
        sameSite: 'Lax',
      }),
    );

    const setCookieOptions = mockCookieService.setCookie.mock.calls[0]?.[0] as {
      maxAge?: number;
    };
    expect(setCookieOptions.maxAge).toBeGreaterThan(0);
  });

  it('should keep the last-organization cookie untouched when the selection is cleared', async () => {
    _store.setOrganization(_organization);
    await _flushEffects();

    expect(mockCookieService.setCookie).toHaveBeenCalledTimes(1);

    _store.clearSelectedOrganization();
    await _flushEffects();

    expect(_store.selectedOrganization()).toBeNull();
    expect(mockCookieService.deleteCookie).not.toHaveBeenCalled();
    expect(mockCookieService.setCookie).toHaveBeenCalledTimes(1);
  });
});
