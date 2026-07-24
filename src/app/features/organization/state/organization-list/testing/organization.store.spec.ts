import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { of, throwError } from 'rxjs';
import type { HydraCollection } from '@core/api/models';
import type { StoreError } from '@core/request-state';
import { OrganizationService } from '@features/organization/data-access';
import type { CreateOrganizationInput, OrganizationOutput } from '@features/organization/models';
import { ActiveOrganizationStore } from '../../active-organization/active-organization.store';
import { organizationSettingsStoreEvents } from '../../organization-settings/events';
import { organizationStoreEvents } from '../events';
import { OrganizationStore } from '../organization.store';

const flushEffects = async (): Promise<void> => {
  await Promise.resolve();
};

describe('OrganizationStore', () => {
  let store: OrganizationStore;
  let mockOrganizationService: {
    list: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
  };
  let dispatcher: Dispatcher;
  let dispatchSpy: ReturnType<typeof vi.spyOn>;
  let activeOrganizationStoreStub: {
    selectedOrganization: ReturnType<typeof signal<OrganizationOutput | null>>;
    isLoadingOrganization: ReturnType<typeof signal<boolean>>;
    clearSelectedOrganization: ReturnType<typeof vi.fn>;
  };

  const organization = { id: 'org-1', name: 'Fireguard' } as unknown as OrganizationOutput;
  const otherOrganization = { id: 'org-2', name: 'Other' } as unknown as OrganizationOutput;
  const collection: HydraCollection<OrganizationOutput> = {
    '@id': '/api/organizations',
    '@type': 'Collection',
    totalItems: 1,
    member: [organization],
  };
  const twoItemCollection: HydraCollection<OrganizationOutput> = {
    '@id': '/api/organizations',
    '@type': 'Collection',
    totalItems: 2,
    member: [organization, otherOrganization],
  };

  beforeEach(() => {
    mockOrganizationService = {
      list: vi.fn().mockReturnValue(of(collection)),
      create: vi.fn(),
      remove: vi.fn(),
    };
    activeOrganizationStoreStub = {
      selectedOrganization: signal<OrganizationOutput | null>(organization),
      isLoadingOrganization: signal(false),
      clearSelectedOrganization: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        OrganizationStore,
        { provide: OrganizationService, useValue: mockOrganizationService },
        {
          provide: ActiveOrganizationStore,
          useValue: activeOrganizationStoreStub,
        },
      ],
    });

    dispatcher = TestBed.inject(Dispatcher);
    dispatchSpy = vi.spyOn(dispatcher, 'dispatch');
    store = TestBed.inject(OrganizationStore);
  });

  it('should load organizations', async () => {
    store.load();
    await flushEffects();

    expect(mockOrganizationService.list).toHaveBeenCalledWith(undefined);
    expect(store.organizations()).toEqual([organization]);
    expect(store.totalOrganizations()).toBe(1);
  });

  it('should proxy the selected organization from the active store', () => {
    expect(store.selectedOrganization()).toEqual(organization);
    expect(store.isLoadingOrganization()).toBe(false);
  });

  describe('load / loadOrganizations', () => {
    it('should expose isEmpty as true before load and false once organizations are loaded', async () => {
      mockOrganizationService.list.mockReturnValue(of(collection));
      expect(store.isEmpty()).toBe(true);

      store.load();
      await flushEffects();

      expect(store.isLoadingOrganizations()).toBe(false);
      expect(store.isEmpty()).toBe(false);
    });

    it('should set listCallState to a normalized StoreError and dispatch listFailed on error', async () => {
      const httpError = { status: 500, message: 'Server error' };
      mockOrganizationService.list.mockReturnValue(throwError(() => httpError));

      store.load();
      await flushEffects();

      expect(store.organizations()).toEqual([]);
      expect(dispatchSpy).toHaveBeenCalledWith(
        organizationStoreEvents.listFailed(
          expect.objectContaining({
            message: expect.any(String) as string,
          }),
        ),
      );
      expect(store.isEmpty()).toBe(true);
    });

    it('should support loadOrganizations as an alias for load', async () => {
      mockOrganizationService.list.mockReturnValue(of(collection));

      store.loadOrganizations();
      await flushEffects();

      expect(mockOrganizationService.list).toHaveBeenCalledWith(undefined);
      expect(store.organizations()).toEqual([organization]);
    });
  });

  describe('create', () => {
    const input = { name: 'New Org' } as unknown as CreateOrganizationInput;

    it('should add the created organization to entities, bump the total and set createCallState to success', async () => {
      mockOrganizationService.create.mockReturnValue(of(otherOrganization));

      expect(store.isCreating()).toBe(false);

      store.create(input);
      await flushEffects();

      expect(mockOrganizationService.create).toHaveBeenCalledWith(input);
      expect(store.organizations()).toContainEqual(otherOrganization);
      expect(store.totalOrganizations()).toBe(1);
      expect(store.isCreating()).toBe(false);
      expect(store.createError()).toBeNull();
    });

    it('should set createCallState to a normalized StoreError and dispatch createFailed on error', async () => {
      const httpError = { status: 400, message: 'Bad request' };
      mockOrganizationService.create.mockReturnValue(throwError(() => httpError));

      store.create(input);
      await flushEffects();

      expect(store.isCreating()).toBe(false);
      expect(store.createError()).not.toBeNull();
      expect(dispatchSpy).toHaveBeenCalledWith(
        organizationStoreEvents.createFailed(
          expect.objectContaining({
            message: expect.any(String) as string,
          }),
        ),
      );
    });
  });

  describe('resetCreateOperation', () => {
    it('should reset createCallState back to idle and clear createError', async () => {
      mockOrganizationService.create.mockReturnValue(throwError(() => ({ status: 400 })));
      store.create({ name: 'X' } as unknown as CreateOrganizationInput);
      await flushEffects();
      expect(store.createError()).not.toBeNull();

      store.resetCreateOperation();

      expect(store.createError()).toBeNull();
      expect(store.isCreating()).toBe(false);
    });
  });

  describe('deleteOne', () => {
    beforeEach(async () => {
      mockOrganizationService.list.mockReturnValue(of(twoItemCollection));
      store.load();
      await flushEffects();
    });

    it('should remove the organization from entities, decrement the total and set deleteCallState to success', async () => {
      mockOrganizationService.remove.mockReturnValue(of(undefined));

      expect(store.isDeleting()).toBe(false);

      store.deleteOne(otherOrganization.id);
      await flushEffects();

      expect(mockOrganizationService.remove).toHaveBeenCalledWith(otherOrganization.id);
      expect(store.organizations()).toEqual([organization]);
      expect(store.totalOrganizations()).toBe(1);
      expect(store.isDeleting()).toBe(false);
    });

    it('should clear the active selection when the deleted organization was selected', async () => {
      mockOrganizationService.remove.mockReturnValue(of(undefined));
      activeOrganizationStoreStub.selectedOrganization.set(organization);

      store.deleteOne(organization.id);
      await flushEffects();

      expect(activeOrganizationStoreStub.clearSelectedOrganization).toHaveBeenCalled();
    });

    it('should not clear the active selection when the deleted organization was not selected', async () => {
      mockOrganizationService.remove.mockReturnValue(of(undefined));
      activeOrganizationStoreStub.selectedOrganization.set(organization);

      store.deleteOne(otherOrganization.id);
      await flushEffects();

      expect(activeOrganizationStoreStub.clearSelectedOrganization).not.toHaveBeenCalled();
    });

    it('should set deleteCallState to a normalized StoreError and dispatch deleteFailed on error', async () => {
      const httpError = { status: 404, message: 'Not found' };
      mockOrganizationService.remove.mockReturnValue(throwError(() => httpError));

      store.deleteOne(organization.id);
      await flushEffects();

      expect(store.isDeleting()).toBe(false);
      expect(store.organizations()).toEqual([organization, otherOrganization]);
      expect(dispatchSpy).toHaveBeenCalledWith(
        organizationStoreEvents.deleteFailed(
          expect.objectContaining({
            message: expect.any(String) as string,
          }),
        ),
      );
    });
  });

  describe('deleteMany', () => {
    beforeEach(async () => {
      mockOrganizationService.list.mockReturnValue(of(twoItemCollection));
      store.load();
      await flushEffects();
    });

    it('should remove all matching organizations, decrement the total and set deleteCallState to success', async () => {
      mockOrganizationService.remove.mockReturnValue(of(undefined));

      store.deleteMany([organization.id, otherOrganization.id]);
      await flushEffects();

      expect(mockOrganizationService.remove).toHaveBeenCalledTimes(2);
      expect(store.organizations()).toEqual([]);
      expect(store.totalOrganizations()).toBe(0);
      expect(store.isDeleting()).toBe(false);
    });

    it('should clear the active selection when the selected organization is among the deleted ids', async () => {
      mockOrganizationService.remove.mockReturnValue(of(undefined));
      activeOrganizationStoreStub.selectedOrganization.set(organization);

      store.deleteMany([organization.id]);
      await flushEffects();

      expect(activeOrganizationStoreStub.clearSelectedOrganization).toHaveBeenCalled();
    });

    it('should not clear the active selection when the selected organization is not among the deleted ids', async () => {
      mockOrganizationService.remove.mockReturnValue(of(undefined));
      activeOrganizationStoreStub.selectedOrganization.set(organization);

      store.deleteMany([otherOrganization.id]);
      await flushEffects();

      expect(activeOrganizationStoreStub.clearSelectedOrganization).not.toHaveBeenCalled();
    });

    it('should set deleteCallState to a normalized StoreError and dispatch deleteManyFailed on error', async () => {
      const httpError = { status: 500, message: 'Server error' };
      mockOrganizationService.remove.mockReturnValue(throwError(() => httpError));

      store.deleteMany([organization.id, otherOrganization.id]);
      await flushEffects();

      expect(store.isDeleting()).toBe(false);
      expect(store.organizations()).toEqual([organization, otherOrganization]);
      expect(dispatchSpy).toHaveBeenCalledWith(
        organizationStoreEvents.deleteManyFailed(
          expect.objectContaining({
            message: expect.any(String) as string,
          }),
        ),
      );
    });
  });

  describe('applyOrganization', () => {
    it('should merge the updated organization into the cached entities when present', async () => {
      mockOrganizationService.list.mockReturnValue(of(collection));
      store.load();
      await flushEffects();

      const updated = { ...organization, name: 'Renamed' } as unknown as OrganizationOutput;
      store.applyOrganization(updated);

      expect(store.organizations()).toEqual([updated]);
    });

    it('should be a no-op when the organization is not part of the loaded collection', async () => {
      mockOrganizationService.list.mockReturnValue(of(collection));
      store.load();
      await flushEffects();

      store.applyOrganization(otherOrganization);

      expect(store.organizations()).toEqual([organization]);
    });
  });

  describe('onInit hook', () => {
    it('should merge organizationSettingsStoreEvents.organizationUpdated payloads into entities', async () => {
      mockOrganizationService.list.mockReturnValue(of(collection));
      store.load();
      await flushEffects();

      const updated = { ...organization, name: 'From Settings' } as unknown as OrganizationOutput;
      dispatcher.dispatch(organizationSettingsStoreEvents.organizationUpdated(updated));
      await flushEffects();

      expect(store.organizations()).toEqual([updated]);
    });
  });

  it('should type the createError computed as StoreError | null', () => {
    const error: StoreError | null = store.createError();
    expect(error).toBeNull();
  });
});
