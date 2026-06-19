import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { of, throwError } from 'rxjs';
import type { ApiError } from '@core/models/api';
import { OrganizationService } from '@features/organization/data-access';
import type { OrganizationOutput } from '@features/organization/models';
import { ActiveOrganizationStore } from '../../active-organization';
import { organizationSettingsStoreEvents } from '../events';
import { OrganizationSettingsStore } from '../organization-settings.store';

const flushEffects = async (): Promise<void> => {
  await Promise.resolve();
};

describe('OrganizationSettingsStore', () => {
  let store: OrganizationSettingsStore;
  let mockOrganizationService: {
    update: ReturnType<typeof vi.fn>;
    uploadLogo: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
  };
  let mockActiveOrganizationStore: {
    setOrganization: ReturnType<typeof vi.fn>;
  };
  let dispatcher: Dispatcher;

  const updatedOrg: OrganizationOutput = {
    '@id': '/api/organizations/org-1',
    '@type': 'Organization',
    id: 'org-1',
    name: 'Renamed Org',
    slug: 'renamed-org',
    ownerUserId: 'user-1',
    createdByUserId: 'user-1',
    status: 'active',
    isActive: true,
    description: 'New description',
    logoUrl: 'https://api.test/api/organizations/org-1/logo.webp',
    memberCount: 3,
    createdAt: '2026-01-01T00:00:00+00:00',
    updatedAt: '2026-06-01T00:00:00+00:00',
  };

  beforeEach(() => {
    mockOrganizationService = {
      update: vi.fn().mockReturnValue(of(updatedOrg)),
      uploadLogo: vi.fn().mockReturnValue(of(updatedOrg)),
      remove: vi.fn().mockReturnValue(of(undefined)),
    };
    mockActiveOrganizationStore = {
      setOrganization: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        OrganizationSettingsStore,
        { provide: OrganizationService, useValue: mockOrganizationService },
        { provide: ActiveOrganizationStore, useValue: mockActiveOrganizationStore },
      ],
    });

    store = TestBed.inject(OrganizationSettingsStore);
    dispatcher = TestBed.inject(Dispatcher);
    vi.spyOn(dispatcher, 'dispatch');
  });

  it('should save settings and refresh the active organization', async () => {
    store.save({ organizationId: 'org-1', input: { name: 'Renamed Org' } });
    await flushEffects();

    expect(mockOrganizationService.update).toHaveBeenCalledWith('org-1', { name: 'Renamed Org' });
    expect(store.saveSucceeded()).toBe(true);
    expect(store.isSaving()).toBe(false);
    expect(mockActiveOrganizationStore.setOrganization).toHaveBeenCalledWith(updatedOrg);
  });

  it('should expose the save error when the update fails', async () => {
    const apiError: ApiError = {
      '@id': '',
      '@type': 'Error',
      status: 409,
      type: 'about:blank',
      title: 'Conflict',
      detail: 'Slug already in use',
      instance: null,
    };
    mockOrganizationService.update.mockReturnValueOnce(throwError(() => apiError));

    store.save({ organizationId: 'org-1', input: { slug: 'taken' } });
    await flushEffects();

    expect(store.saveError()).not.toBeNull();
    expect(store.saveSucceeded()).toBe(false);
    expect(mockActiveOrganizationStore.setOrganization).not.toHaveBeenCalled();
  });

  it('should upload the logo and refresh the active organization', async () => {
    const file = new File(['x'], 'logo.png', { type: 'image/png' });

    store.uploadLogo({ organizationId: 'org-1', file, fileName: 'logo.png' });
    await flushEffects();

    expect(mockOrganizationService.uploadLogo).toHaveBeenCalledWith('org-1', file, 'logo.png');
    expect(store.uploadLogoSucceeded()).toBe(true);
    expect(mockActiveOrganizationStore.setOrganization).toHaveBeenCalledWith(updatedOrg);
    expect(dispatcher.dispatch).toHaveBeenCalledWith(
      organizationSettingsStoreEvents.organizationUpdated(updatedOrg),
    );
  });

  it('should delete the organization', async () => {
    store.deleteOrganization({ organizationId: 'org-1' });
    await flushEffects();

    expect(mockOrganizationService.remove).toHaveBeenCalledWith('org-1');
    expect(store.deleteSucceeded()).toBe(true);
    expect(store.isDeleting()).toBe(false);
  });
});
