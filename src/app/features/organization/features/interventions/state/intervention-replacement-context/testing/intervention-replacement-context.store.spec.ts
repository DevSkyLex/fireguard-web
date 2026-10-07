import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { AUTH_SESSION_PORT } from '@features/auth/ports';
import { OrganizationPermissionService } from '@features/organization/access';
import type { EquipmentOutput } from '@features/organization/features/equipments/models';
import { InterventionOfflineService } from '@features/organization/features/interventions/data-access';
import type { InterventionReplacementContext } from '@features/organization/features/interventions/models';
import { InterventionReplacementContextService } from '@features/organization/features/interventions/services';
import { ORGANIZATION_CONTEXT_PORT } from '@features/organization/ports';
import { InterventionReplacementContextStore } from '../intervention-replacement-context.store';

describe('InterventionReplacementContextStore', () => {
  const scope = { organizationId: 'org-1', equipmentId: 'original', workItemId: 'task' };
  const proof: InterventionReplacementContext = {
    original: { id: 'original' } as EquipmentOutput,
    successor: { id: 'successor' } as EquipmentOutput,
  };
  const account = signal<string | null>('account');
  const organization = signal<string | null>('org-1');
  const revision = signal(1);
  const allowed = signal(true);
  const authenticated = signal(true);
  const service = { load: vi.fn() };
  beforeEach(() => {
    account.set('account');
    organization.set('org-1');
    revision.set(1);
    allowed.set(true);
    authenticated.set(true);
    service.load.mockReset().mockReturnValue(of(proof));
    TestBed.configureTestingModule({
      providers: [
        InterventionReplacementContextStore,
        { provide: InterventionReplacementContextService, useValue: service },
        { provide: InterventionOfflineService, useValue: { publicationOwner: account } },
        { provide: ORGANIZATION_CONTEXT_PORT, useValue: { selectedOrganizationId: organization } },
        {
          provide: AUTH_SESSION_PORT,
          useValue: { sessionRevision: revision, isAuthenticated: authenticated },
        },
        {
          provide: OrganizationPermissionService,
          useValue: {
            isLoadingPermissions: signal(false),
            permissionError: signal(null),
            hasPermission: () => allowed(),
          },
        },
      ],
    });
  });
  it('replaces proof only after a completed current read and cancels obsolete task reads', () => {
    const store = TestBed.inject(InterventionReplacementContextStore);
    const pending = new Subject<InterventionReplacementContext>();
    service.load.mockReturnValueOnce(pending);
    store.load(scope);
    expect(store.isQueryLoading()).toBe(true);
    expect(store.queryData()).toBeNull();
    store.load({ ...scope, workItemId: 'next-task' });
    expect(pending.observed).toBe(false);
    pending.next({ ...proof, successor: null });
    expect(store.queryData()).toEqual(proof);
    expect(store.scope()?.workItemId).toBe('next-task');
  });
  it.each(['account', 'organization', 'session', 'permission', 'authentication'] as const)(
    'clears current proof and cancels pending work when %s changes',
    (changed) => {
      const store = TestBed.inject(InterventionReplacementContextStore);
      store.load(scope);
      TestBed.tick();
      expect(store.queryData()).toEqual(proof);
      const pending = new Subject<InterventionReplacementContext>();
      service.load.mockReturnValueOnce(pending);
      store.load(scope);
      TestBed.tick();
      if (changed === 'account') account.set('other');
      if (changed === 'organization') organization.set('org-2');
      if (changed === 'session') revision.set(2);
      if (changed === 'permission') allowed.set(false);
      if (changed === 'authentication') authenticated.set(false);
      TestBed.tick();
      expect(pending.observed).toBe(false);
      expect(store.scope()).toBeNull();
      expect(store.queryData()).toBeNull();
      expect(store.authorized()).toBe(false);
    },
  );
  it('retains a readable failure and explicitly retries without accepting stale proof', () => {
    const store = TestBed.inject(InterventionReplacementContextStore);
    service.load.mockReturnValueOnce(throwError(() => new Error('Offline')));
    store.load(scope);
    expect(store.queryHasError()).toBe(true);
    expect(store.queryData()).toBeNull();
    store.load(scope);
    expect(store.queryHasError()).toBe(false);
    expect(store.queryData()).toEqual(proof);
  });
  it('never sends an unauthorized read', () => {
    const store = TestBed.inject(InterventionReplacementContextStore);
    allowed.set(false);
    store.load(scope);
    TestBed.tick();
    expect(service.load).not.toHaveBeenCalled();
    expect(store.scope()).toBeNull();
  });
});
