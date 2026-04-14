import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Dispatcher } from '@ngrx/signals/events';
import { of, throwError } from 'rxjs';
import type { ApiError } from '@core/models/api';
import { OrganizationService } from '@features/organization/data-access';
import type { OrganizationOutput } from '@features/organization/models';
import { ActiveOrganizationStore } from '../active-organization.store';

const _flushEffects = async (): Promise<void> => {
  await Promise.resolve();
};

describe('ActiveOrganizationStore', () => {
  let _store: ActiveOrganizationStore;
  let mockDispatcher: { dispatch: ReturnType<typeof vi.fn> };
  let mockOrganizationService: {
    get: ReturnType<typeof vi.fn>;
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

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: Dispatcher, useValue: mockDispatcher },
        { provide: OrganizationService, useValue: mockOrganizationService },
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
});

