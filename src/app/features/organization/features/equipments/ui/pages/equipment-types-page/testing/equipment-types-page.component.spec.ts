import { PLATFORM_ID, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { ConnectivityService } from '@core/connectivity';
import { INTERACTION_CAPABILITIES_PORT } from '@core/interaction-capabilities';
import {
  errorCallState,
  idleCallState,
  pendingCallState,
  successCallState,
  type CallState,
} from '@core/request-state';
import { OrganizationPermissionService } from '@features/organization/access';
import type { EquipmentTypeOutput } from '@features/organization/features/equipments/models';
import { EquipmentTypeAdministrationStore } from '@features/organization/features/equipments/state/equipment-type-administration';
import { EquipmentTypesPage } from '../equipment-types-page.component';

describe('EquipmentTypesPage', () => {
  let fixture: ComponentFixture<EquipmentTypesPage>;
  let entries: WritableSignal<EquipmentTypeOutput[]>;
  let listState: WritableSignal<CallState>;
  let writeState: WritableSignal<CallState<EquipmentTypeOutput>>;
  let online: WritableSignal<boolean>;
  let allowed: WritableSignal<boolean>;
  let store: {
    equipmentTypeEntities: typeof entries;
    listCallState: typeof listState;
    writeCallState: typeof writeState;
    load: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    clearWrite: ReturnType<typeof vi.fn>;
  };
  const entry: EquipmentTypeOutput = {
    '@id': '/api/organizations/org-1/equipment-types/blanket',
    '@type': 'EquipmentType',
    value: 'blanket',
    label: 'Blanket',
    family: 'fire',
    archived: false,
    revision: 3,
  };

  const create = async (platform: 'browser' | 'server' = 'browser'): Promise<void> => {
    TestBed.overrideProvider(PLATFORM_ID, { useValue: platform });
    fixture = TestBed.createComponent(EquipmentTypesPage);
    fixture.componentRef.setInput('organizationId', 'org-1');
    await fixture.whenStable();
  };

  beforeEach(async () => {
    entries = signal([entry]);
    listState = signal<CallState>(successCallState(null));
    writeState = signal<CallState<EquipmentTypeOutput>>(idleCallState());
    online = signal(true);
    allowed = signal(true);
    store = {
      equipmentTypeEntities: entries,
      listCallState: listState,
      writeCallState: writeState,
      load: vi.fn(),
      save: vi.fn(),
      clearWrite: vi.fn(() => writeState.set(idleCallState())),
    };
    await TestBed.configureTestingModule({
      imports: [EquipmentTypesPage],
      providers: [
        { provide: EquipmentTypeAdministrationStore, useValue: store },
        {
          provide: INTERACTION_CAPABILITIES_PORT,
          useValue: { isMobileInteractionMode: signal(false) },
        },
        { provide: OrganizationPermissionService, useValue: { hasPermission: () => allowed() } },
        { provide: ConnectivityService, useValue: { isOnline: () => online() } },
      ],
    })
      .overrideComponent(EquipmentTypesPage, { set: { providers: [] } })
      .compileComponents();
  });

  it('loads once in the browser and renders the organization catalogue', async () => {
    await create();
    expect(store.load.mock.calls).toEqual([[null], ['org-1']]);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Blanket');
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('h1')).toHaveLength(0);
    fixture.componentRef.setInput('organizationId', 'org-2');
    await fixture.whenStable();
    expect(store.load.mock.calls).toEqual([[null], ['org-1'], [null], ['org-2']]);
  });

  it('does not fetch private catalogue data during SSR', async () => {
    await create('server');
    expect(store.load.mock.calls).toEqual([[null]]);
  });

  it('saves against the reviewed immutable code and revision', async () => {
    await create();
    fixture.componentInstance['open'](entry);
    fixture.componentInstance['submitted']({
      value: 'changed_code',
      label: 'New label',
      family: 'safety',
    });
    expect(store.save).toHaveBeenCalledWith({
      kind: 'update',
      organizationId: 'org-1',
      value: entry.value,
      input: { revision: 3, label: 'New label', family: 'safety' },
    });
  });

  it('reviews the latest revision only on explicit request before saving retained fields', async () => {
    await create();
    fixture.componentInstance['open'](entry);
    writeState.set(
      errorCallState({
        code: 409,
        message: 'Revision changed.',
        error: null,
        retryable: false,
        timestamp: 0,
      }),
    );
    store.load.mockImplementation((organizationId: string | null) => {
      if (organizationId) listState.set(pendingCallState());
    });
    fixture.componentInstance['refreshRevision']();
    entries.set([{ ...entry, label: 'Another user label', revision: 4 }]);
    listState.set(successCallState(null));
    await fixture.whenStable();
    expect(fixture.componentInstance['editing']()?.revision).toBe(4);
    fixture.componentInstance['submitted']({
      value: entry.value,
      label: 'Retained draft',
      family: 'fire',
    });
    expect(store.save).toHaveBeenCalledWith({
      kind: 'update',
      organizationId: 'org-1',
      value: entry.value,
      input: { revision: 4, label: 'Retained draft', family: 'fire' },
    });
  });

  it('keeps dirty editor drafts when dismissal is cancelled', async () => {
    await create();
    fixture.componentInstance['open'](entry);
    fixture.componentInstance['dirty'].set(true);
    fixture.componentInstance['requestClose']();
    expect(fixture.componentInstance['confirmation']()).toBe('open');
    fixture.componentInstance['resolveConfirmation'](false);
    expect(fixture.componentInstance['editorVisible']()).toBe(true);
    expect(fixture.componentInstance.hasUnsavedChanges()).toBe(true);
    const leaving = fixture.componentInstance.confirmDeactivation();
    fixture.componentInstance['resolveConfirmation'](true);
    await expect(leaving).resolves.toBe(true);
    expect(fixture.componentInstance['editorVisible']()).toBe(false);
  });

  it('blocks accepted commands from being cancelled by navigation', async () => {
    await create();
    writeState.set(pendingCallState());
    expect(fixture.componentInstance.hasUnsavedChanges()).toBe(true);
    await expect(fixture.componentInstance.confirmDeactivation()).resolves.toBe(false);
    expect(fixture.componentInstance['confirmation']()).toBe('closed');
  });

  it('enforces write permission and connectivity for all catalogue actions', async () => {
    await create();
    allowed.set(false);
    await fixture.whenStable();
    fixture.componentInstance['open'](entry);
    fixture.componentInstance['archive'](entry);
    fixture.componentInstance['submitted']({
      value: entry.value,
      label: 'Blocked',
      family: 'fire',
    });
    expect(store.save).not.toHaveBeenCalled();
    expect(fixture.componentInstance['editorVisible']()).toBe(false);
    allowed.set(true);
    online.set(false);
    await fixture.whenStable();
    fixture.componentInstance['open'](entry);
    fixture.componentInstance['archive'](entry);
    expect(store.save).not.toHaveBeenCalled();
  });
});
