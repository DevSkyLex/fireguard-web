import { provideZonelessChangeDetection, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { Dispatcher } from '@ngrx/signals/events';
import type { StoreError } from '@core/request-state';
import type { ChannelOutput } from '@features/organization/features/collaboration/models';
import {
  channelsStoreEvents,
  ChannelsStore,
} from '@features/organization/features/collaboration/state';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import {
  ORGANIZATION_CONTEXT_PORT,
  ORGANIZATION_MEMBER_ACCESS_PORT,
} from '@features/organization/ports';
import { ChannelsPage } from '../channels-page.component';

function channel(overrides: Partial<ChannelOutput> = {}): ChannelOutput {
  return {
    '@id': '/.well-known/genid/deadbeef',
    '@type': 'ChannelOutput',
    id: 'channel-1',
    organization: '/api/organizations/org-1',
    name: 'Bâtiment Nord',
    participantCount: 4,
    isArchived: false,
    messagesCount: 12,
    unreadCount: 0,
    createdAt: '2026-01-01T00:00:00+00:00',
    updatedAt: '2026-01-02T00:00:00+00:00',
    isFavorite: false,
    ...overrides,
  } as ChannelOutput;
}

describe('ChannelsPage', () => {
  let fixture: ComponentFixture<ChannelsPage>;
  let channelEntities: WritableSignal<readonly ChannelOutput[]>;
  let storeOrganizationId: WritableSignal<string | null>;
  let isLoading: WritableSignal<boolean>;
  let loadError: WritableSignal<StoreError | null>;
  let isMutating: WritableSignal<boolean>;
  let permissions: WritableSignal<ReadonlyArray<string>>;
  let load: ReturnType<typeof vi.fn>;
  let create: ReturnType<typeof vi.fn>;
  let setParent: ReturnType<typeof vi.fn>;
  let navigate: ReturnType<typeof vi.fn>;

  const byTestId = (id: string): HTMLElement | null =>
    (fixture.nativeElement as HTMLElement).querySelector(`[data-testid="${id}"]`);

  async function createPage(): Promise<void> {
    const rootChannels = (): readonly ChannelOutput[] =>
      channelEntities().filter((c) => c.parent === undefined);

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: {} },
        {
          provide: ORGANIZATION_CONTEXT_PORT,
          useValue: { selectedOrganizationId: signal('org-1') },
        },
        { provide: ORGANIZATION_MEMBER_ACCESS_PORT, useValue: { permissions } },
      ],
    });

    TestBed.overrideComponent(ChannelsPage, {
      remove: { providers: [ChannelsStore] },
      add: {
        providers: [
          {
            provide: ChannelsStore,
            useValue: {
              channelEntities,
              organizationId: storeOrganizationId,
              isLoading,
              loadError,
              isMutating,
              rootChannels,
              load,
              create,
              setParent,
            },
          },
        ],
      },
    });

    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true) as never;

    fixture = TestBed.createComponent(ChannelsPage);
    await fixture.whenStable();
  }

  beforeEach(() => {
    channelEntities = signal<readonly ChannelOutput[]>([]);
    storeOrganizationId = signal<string | null>(null);
    isLoading = signal(false);
    loadError = signal<StoreError | null>(null);
    isMutating = signal(false);
    permissions = signal<ReadonlyArray<string>>([ORGANIZATION_PERMISSION.MESSAGING_MANAGE]);
    load = vi.fn();
    create = vi.fn();
    setParent = vi.fn();
  });

  afterEach(() => TestBed.resetTestingModule());

  it('should load the routed organization’s channels once', async () => {
    await createPage();

    expect(load).toHaveBeenCalledWith({ organization: 'org-1' });
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('should not reload when the store already holds the routed organization', async () => {
    storeOrganizationId.set('org-1');
    await createPage();

    expect(load).not.toHaveBeenCalled();
  });

  it('should show a loading skeleton while the first page is on its way', async () => {
    isLoading.set(true);
    await createPage();

    expect(fixture.nativeElement.querySelector('[role="status"]')).not.toBeNull();
    expect(byTestId('channels-tree')).toBeNull();
  });

  it('should offer a retry that re-runs the load after a failure', async () => {
    loadError.set({ message: 'offline' } as StoreError);
    await createPage();
    load.mockClear();

    byTestId('channels-retry')?.dispatchEvent(new Event('click', { bubbles: true }));
    await fixture.whenStable();

    expect(load).toHaveBeenCalledWith({ organization: 'org-1' });
  });

  it('should show Create only to a member holding messaging.manage', async () => {
    await createPage();
    expect(byTestId('channels-new')).not.toBeNull();

    permissions.set([]);
    await fixture.whenStable();

    expect(byTestId('channels-new')).toBeNull();
  });

  it('should honour a namespace wildcard grant for Create', async () => {
    permissions.set(['organization.*']);
    await createPage();

    expect(byTestId('channels-new')).not.toBeNull();
  });

  it('should list favorites above the full tree, and nest one level of children', async () => {
    channelEntities.set([
      channel({ id: 'root-1', name: 'General' }),
      channel({ id: 'root-2', name: 'Safety', isFavorite: true }),
      channel({ id: 'child-1', name: 'Sub-team', parent: '/api/channels/root-1' }),
    ]);
    await createPage();

    const favoriteRows = byTestId('channels-favorites')?.querySelectorAll(
      '[data-testid="channels-row"]',
    );
    const treeRows = byTestId('channels-tree')?.querySelectorAll('[data-testid="channels-row"]');

    expect(favoriteRows).toHaveLength(1);
    expect(favoriteRows?.[0].textContent).toContain('Safety');
    // The tree lists both roots plus the one nested child — three rows total.
    expect(treeRows).toHaveLength(3);
  });

  it('should send the create payload scoped to the routed organization', async () => {
    await createPage();

    fixture.componentInstance['submitCreate']({ name: 'Incident room', parentChannelId: null });

    expect(create).toHaveBeenCalledWith({ organization: 'org-1', name: 'Incident room' });
  });

  it('should navigate into the newly created channel', async () => {
    await createPage();
    fixture.componentInstance['submitCreate']({ name: 'Incident room', parentChannelId: null });

    TestBed.inject(Dispatcher).dispatch(channelsStoreEvents.created(channel({ id: 'channel-9' })));

    expect(navigate).toHaveBeenCalledWith(['channel-9'], {
      relativeTo: TestBed.inject(ActivatedRoute),
    });
    expect(setParent).not.toHaveBeenCalled();
  });

  it('should apply the chosen parent once the create resolves, then navigate', async () => {
    await createPage();
    fixture.componentInstance['submitCreate']({
      name: 'Incident room',
      parentChannelId: 'root-1',
    });

    TestBed.inject(Dispatcher).dispatch(channelsStoreEvents.created(channel({ id: 'channel-9' })));

    expect(setParent).toHaveBeenCalledWith({
      channelId: 'channel-9',
      input: { parentChannelId: 'root-1' },
    });
    expect(navigate).toHaveBeenCalledWith(['channel-9'], {
      relativeTo: TestBed.inject(ActivatedRoute),
    });
  });
});
