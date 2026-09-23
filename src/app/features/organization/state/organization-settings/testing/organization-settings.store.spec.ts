import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { of, Subject, throwError } from 'rxjs';
import type { ApiError } from '@core/api/models';
import { AUTH_SESSION_PORT } from '@features/auth/ports';
import { OrganizationMemberService, OrganizationService } from '@features/organization/data-access';
import type { OrganizationOutput } from '@features/organization/models';
import { ActiveOrganizationStore } from '../../active-organization';
import { organizationSettingsStoreEvents } from '../events';
import { OrganizationSettingsStore } from '../organization-settings.store';

const flushEffects = async (): Promise<void> => {
  await Promise.resolve();
};

describe('OrganizationSettingsStore', () => {
  const sessionRevision = signal(0);
  const isAuthenticated = signal(true);
  const selectedOrganization = signal<OrganizationOutput | null>(null);
  const selectedOrganizationId = computed(() => selectedOrganization()?.id ?? null);
  let store: OrganizationSettingsStore;
  let mockOrganizationService: {
    update: ReturnType<typeof vi.fn>;
    uploadLogo: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
    removeLogo: ReturnType<typeof vi.fn>;
    transferOwnership: ReturnType<typeof vi.fn>;
    suspend: ReturnType<typeof vi.fn>;
    restore: ReturnType<typeof vi.fn>;
  };
  let mockMemberService: {
    leave: ReturnType<typeof vi.fn>;
  };
  let mockActiveOrganizationStore: {
    setOrganization: ReturnType<typeof vi.fn>;
    selectedOrganization: typeof selectedOrganization;
    selectedOrganizationId: typeof selectedOrganizationId;
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
    sessionRevision.set(0);
    isAuthenticated.set(true);
    mockOrganizationService = {
      update: vi.fn().mockReturnValue(of(updatedOrg)),
      uploadLogo: vi.fn().mockReturnValue(of(updatedOrg)),
      remove: vi.fn().mockReturnValue(of(undefined)),
      removeLogo: vi.fn().mockReturnValue(of(undefined)),
      transferOwnership: vi.fn().mockReturnValue(of(updatedOrg)),
      suspend: vi.fn().mockReturnValue(of({ ...updatedOrg, status: 'suspended', isActive: false })),
      restore: vi.fn().mockReturnValue(of(updatedOrg)),
    };
    mockMemberService = {
      leave: vi.fn().mockReturnValue(of(undefined)),
    };
    selectedOrganization.set(updatedOrg);
    mockActiveOrganizationStore = {
      setOrganization: vi.fn(),
      selectedOrganization,
      selectedOrganizationId,
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AUTH_SESSION_PORT, useValue: { isAuthenticated, sessionRevision } },
        OrganizationSettingsStore,
        { provide: OrganizationService, useValue: mockOrganizationService },
        { provide: OrganizationMemberService, useValue: mockMemberService },
        { provide: ActiveOrganizationStore, useValue: mockActiveOrganizationStore },
      ],
    });

    store = TestBed.inject(OrganizationSettingsStore);
    dispatcher = TestBed.inject(Dispatcher);
    vi.spyOn(dispatcher, 'dispatch').mockClear();
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
    store.deleteOrganization({ organizationId: 'org-1', slug: 'acme' });
    await flushEffects();

    expect(mockOrganizationService.remove).toHaveBeenCalledWith('org-1', 'acme');
    expect(store.deleteSucceeded()).toBe(true);
    expect(store.isDeleting()).toBe(false);
  });
  it('should clear the logo locally rather than refetching, since the endpoint returns no body', async () => {
    store.removeLogo({ organizationId: 'org-1' });
    await flushEffects();

    expect(mockOrganizationService.removeLogo).toHaveBeenCalledWith('org-1');
    expect(mockActiveOrganizationStore.setOrganization).toHaveBeenCalledWith({
      ...updatedOrg,
      logoUrl: null,
    });
    expect(store.isRemovingLogo()).toBe(false);
  });

  it('should transfer ownership and refresh the active organization', async () => {
    store.transferOwnership({
      organizationId: 'org-1',
      newOwnerUserId: 'user-2',
      slug: 'renamed-org',
    });
    await flushEffects();

    expect(mockOrganizationService.transferOwnership).toHaveBeenCalledWith('org-1', {
      newOwnerUserId: 'user-2',
      slug: 'renamed-org',
    });
    expect(mockActiveOrganizationStore.setOrganization).toHaveBeenCalledWith(updatedOrg);
    expect(store.transferOwnershipSucceeded()).toBe(true);
  });

  it('should expose the transfer error when the slug confirmation is refused', async () => {
    const apiError: ApiError = {
      '@id': '',
      '@type': 'Error',
      status: 422,
      type: 'about:blank',
      title: 'Unprocessable Entity',
      detail: 'Slug confirmation does not match.',
    };
    mockOrganizationService.transferOwnership.mockReturnValue(throwError(() => apiError));

    store.transferOwnership({ organizationId: 'org-1', newOwnerUserId: 'user-2', slug: 'nope' });
    await flushEffects();

    expect(store.transferOwnershipError()?.message).toBe('Slug confirmation does not match.');
    expect(store.isTransferringOwnership()).toBe(false);
  });

  it('should suspend and restore through one shared status call state', async () => {
    store.suspend({ organizationId: 'org-1' });
    await flushEffects();

    expect(mockOrganizationService.suspend).toHaveBeenCalledWith('org-1');
    expect(store.statusError()).toBeNull();

    store.restore({ organizationId: 'org-1' });
    await flushEffects();

    expect(mockOrganizationService.restore).toHaveBeenCalledWith('org-1');
    expect(store.isChangingStatus()).toBe(false);
  });

  it('should leave the organization', async () => {
    store.leave({ organizationId: 'org-1' });
    await flushEffects();

    expect(mockMemberService.leave).toHaveBeenCalledWith('org-1');
    expect(store.leaveSucceeded()).toBe(true);
  });

  it('should expose the conflict raised when the owner tries to leave', async () => {
    const apiError: ApiError = {
      '@id': '',
      '@type': 'Error',
      status: 409,
      type: 'about:blank',
      title: 'Conflict',
      detail: 'Transfer ownership before leaving.',
    };
    mockMemberService.leave.mockReturnValue(throwError(() => apiError));

    store.leave({ organizationId: 'org-1' });
    await flushEffects();

    expect(store.leaveError()?.message).toBe('Transfer ownership before leaving.');
    expect(store.leaveSucceeded()).toBe(false);
  });
  it('keeps an accepted save running across navigation without applying it to the new organization', () => {
    const first = new Subject<OrganizationOutput>();
    const second = new Subject<OrganizationOutput>();
    mockOrganizationService.update.mockReturnValueOnce(first).mockReturnValueOnce(second);
    store.save({ organizationId: 'org-1', input: { name: 'First' } });
    selectedOrganization.set({ ...updatedOrg, id: 'org-2' });
    store.save({ organizationId: 'org-2', input: { name: 'Second' } });
    expect(first.observed).toBe(true);
    first.next(updatedOrg);
    expect(store.isSaving()).toBe(true);
    expect(mockActiveOrganizationStore.setOrganization).not.toHaveBeenCalled();
    expect(dispatcher.dispatch).toHaveBeenCalledWith(
      organizationSettingsStoreEvents.organizationUpdated(updatedOrg),
    );
    second.next({ ...updatedOrg, id: 'org-2', name: 'Second' });
    expect(store.saveSucceeded()).toBe(true);
    expect(mockActiveOrganizationStore.setOrganization).toHaveBeenCalledWith({
      ...updatedOrg,
      id: 'org-2',
      name: 'Second',
    });
  });

  it('does not clear another organization logo and publishes the actual mutated organization', () => {
    const response = new Subject<void>();
    mockOrganizationService.removeLogo.mockReturnValueOnce(response);
    store.removeLogo({ organizationId: 'org-1' });
    selectedOrganization.set({ ...updatedOrg, id: 'org-2', logoUrl: 'other-logo' });
    TestBed.tick();
    expect(store.isRemovingLogo()).toBe(false);
    response.next();
    expect(mockActiveOrganizationStore.setOrganization).not.toHaveBeenCalled();
    expect(dispatcher.dispatch).toHaveBeenCalledWith(
      organizationSettingsStoreEvents.organizationUpdated({ ...updatedOrg, logoUrl: null }),
    );
    expect(store.removeLogoCallState().status).toBe('idle');
  });

  it('ignores an old save error after A to B to A and keeps the newer action pending', () => {
    const first = new Subject<OrganizationOutput>();
    const second = new Subject<OrganizationOutput>();
    mockOrganizationService.update.mockReturnValueOnce(first).mockReturnValueOnce(second);
    store.save({ organizationId: 'org-1', input: { name: 'First' } });
    selectedOrganization.set({ ...updatedOrg, id: 'org-2' });
    TestBed.tick();
    selectedOrganization.set(updatedOrg);
    store.save({ organizationId: 'org-1', input: { name: 'Second' } });
    first.error(new Error('old failure'));
    expect(store.isSaving()).toBe(true);
    expect(store.saveError()).toBeNull();
    expect(dispatcher.dispatch).not.toHaveBeenCalled();
    second.next(updatedOrg);
    expect(store.saveSucceeded()).toBe(true);
  });

  it('rejects a duplicate pending action without cancelling the accepted write', () => {
    const response = new Subject<OrganizationOutput>();
    mockOrganizationService.update.mockReturnValueOnce(response);
    store.save({ organizationId: 'org-1', input: { name: 'First' } });
    store.save({ organizationId: 'org-1', input: { name: 'Second' } });
    expect(mockOrganizationService.update).toHaveBeenCalledOnce();
    expect(response.observed).toBe(true);
    response.next(updatedOrg);
    expect(store.saveSucceeded()).toBe(true);
  });

  it('ignores a mutation from an earlier session even before context effects run', () => {
    const response = new Subject<OrganizationOutput>();
    mockOrganizationService.update.mockReturnValueOnce(response);
    store.save({ organizationId: 'org-1', input: { name: 'First' } });
    sessionRevision.update((revision) => revision + 1);
    response.next(updatedOrg);
    expect(mockActiveOrganizationStore.setOrganization).not.toHaveBeenCalled();
    expect(dispatcher.dispatch).not.toHaveBeenCalled();
    expect(store.saveCallState().status).toBe('idle');
  });

  it('rejects every stale organization command after switching workspaces', () => {
    selectedOrganization.set({ ...updatedOrg, id: 'org-2' });
    TestBed.tick();
    const file = new File(['image'], 'logo.png', { type: 'image/png' });

    store.save({ organizationId: 'org-1', input: { name: 'Stale' } });
    store.uploadLogo({ organizationId: 'org-1', file, fileName: file.name });
    store.removeLogo({ organizationId: 'org-1' });
    store.transferOwnership({
      organizationId: 'org-1',
      newOwnerUserId: 'user-2',
      slug: updatedOrg.slug,
    });
    store.suspend({ organizationId: 'org-1' });
    store.restore({ organizationId: 'org-1' });
    store.leave({ organizationId: 'org-1' });
    store.deleteOrganization({ organizationId: 'org-1', slug: updatedOrg.slug });

    expect(mockOrganizationService.update).not.toHaveBeenCalled();
    expect(mockOrganizationService.uploadLogo).not.toHaveBeenCalled();
    expect(mockOrganizationService.removeLogo).not.toHaveBeenCalled();
    expect(mockOrganizationService.transferOwnership).not.toHaveBeenCalled();
    expect(mockOrganizationService.suspend).not.toHaveBeenCalled();
    expect(mockOrganizationService.restore).not.toHaveBeenCalled();
    expect(mockMemberService.leave).not.toHaveBeenCalled();
    expect(mockOrganizationService.remove).not.toHaveBeenCalled();
  });

  it('does not accept organization writes after the auth session ends', () => {
    isAuthenticated.set(false);
    TestBed.tick();
    const file = new File(['image'], 'logo.png', { type: 'image/png' });

    store.save({ organizationId: 'org-1', input: { name: 'Stale' } });
    store.uploadLogo({ organizationId: 'org-1', file, fileName: file.name });
    store.removeLogo({ organizationId: 'org-1' });
    store.transferOwnership({
      organizationId: 'org-1',
      newOwnerUserId: 'user-2',
      slug: updatedOrg.slug,
    });
    store.suspend({ organizationId: 'org-1' });
    store.restore({ organizationId: 'org-1' });
    store.leave({ organizationId: 'org-1' });
    store.deleteOrganization({ organizationId: 'org-1', slug: updatedOrg.slug });

    expect(mockOrganizationService.update).not.toHaveBeenCalled();
    expect(mockOrganizationService.uploadLogo).not.toHaveBeenCalled();
    expect(mockOrganizationService.removeLogo).not.toHaveBeenCalled();
    expect(mockOrganizationService.transferOwnership).not.toHaveBeenCalled();
    expect(mockOrganizationService.suspend).not.toHaveBeenCalled();
    expect(mockOrganizationService.restore).not.toHaveBeenCalled();
    expect(mockMemberService.leave).not.toHaveBeenCalled();
    expect(mockOrganizationService.remove).not.toHaveBeenCalled();
  });

  it('keeps a failed logo upload visible and allows a new upload', async () => {
    const file = new File(['image'], 'logo.png', { type: 'image/png' });
    mockOrganizationService.uploadLogo.mockReturnValueOnce(
      throwError(() => new Error('Upload failed')),
    );

    store.uploadLogo({ organizationId: 'org-1', file, fileName: file.name });
    await flushEffects();
    expect(store.uploadLogoError()).not.toBeNull();
    expect(mockActiveOrganizationStore.setOrganization).not.toHaveBeenCalled();

    store.uploadLogo({ organizationId: 'org-1', file, fileName: file.name });
    await flushEffects();
    expect(store.uploadLogoSucceeded()).toBe(true);
    expect(mockActiveOrganizationStore.setOrganization).toHaveBeenCalledWith(updatedOrg);
  });

  it('keeps the current logo when removal fails and succeeds on retry', async () => {
    mockOrganizationService.removeLogo.mockReturnValueOnce(throwError(() => new Error('Offline')));

    store.removeLogo({ organizationId: 'org-1' });
    await flushEffects();
    expect(store.removeLogoError()).not.toBeNull();
    expect(mockActiveOrganizationStore.setOrganization).not.toHaveBeenCalled();

    store.removeLogo({ organizationId: 'org-1' });
    await flushEffects();
    expect(store.removeLogoCallState().status).toBe('success');
    expect(mockActiveOrganizationStore.setOrganization).toHaveBeenCalledWith({
      ...updatedOrg,
      logoUrl: null,
    });
  });

  it('retains status and delete errors without publishing a successful mutation', async () => {
    mockOrganizationService.suspend.mockReturnValueOnce(
      throwError(() => new Error('Suspend failed')),
    );
    mockOrganizationService.restore.mockReturnValueOnce(
      throwError(() => new Error('Restore failed')),
    );
    mockOrganizationService.remove.mockReturnValueOnce(
      throwError(() => new Error('Delete failed')),
    );

    store.suspend({ organizationId: 'org-1' });
    await flushEffects();
    expect(store.statusError()).not.toBeNull();
    store.restore({ organizationId: 'org-1' });
    await flushEffects();
    expect(store.statusError()).not.toBeNull();
    store.deleteOrganization({ organizationId: 'org-1', slug: updatedOrg.slug });
    await flushEffects();
    expect(store.deleteError()).not.toBeNull();
    expect(mockActiveOrganizationStore.setOrganization).not.toHaveBeenCalled();
  });
});
