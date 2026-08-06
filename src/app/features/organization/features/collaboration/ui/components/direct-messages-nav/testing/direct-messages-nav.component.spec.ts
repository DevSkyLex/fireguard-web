import { provideZonelessChangeDetection, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Dispatcher } from '@ngrx/signals/events';
import type { ConversationOutput } from '@features/organization/features/collaboration/models';
import {
  DirectConversationsStore,
  directConversationsStoreEvents,
} from '@features/organization/features/collaboration/state';
import { ORGANIZATION_PERMISSION, type MemberDirectoryEntry } from '@features/organization/models';
import {
  MEMBER_DIRECTORY_PORT,
  ORGANIZATION_CONTEXT_PORT,
  ORGANIZATION_MEMBER_ACCESS_PORT,
} from '@features/organization/ports';
import { DirectMessagesNav } from '../direct-messages-nav.component';

function conversation(overrides: Partial<ConversationOutput> = {}): ConversationOutput {
  return {
    '@id': '/.well-known/genid/deadbeef',
    '@type': 'ConversationOutput',
    id: 'dc-1',
    organization: '/api/organizations/org-1',
    subjectType: 'direct',
    visibility: 'participants',
    messagesCount: 5,
    isArchived: false,
    unreadCount: 0,
    createdAt: '2026-01-01T00:00:00+00:00',
    updatedAt: '2026-01-02T00:00:00+00:00',
    isChannel: false,
    isFavorite: false,
    counterpartMember: '/api/organizations/org-1/members/member-9',
    ...overrides,
  };
}

describe('DirectMessagesNav', () => {
  let fixture: ComponentFixture<DirectMessagesNav>;
  let rows: WritableSignal<readonly ConversationOutput[]>;
  let directoryAvailable: WritableSignal<boolean>;
  let directoryEntries: WritableSignal<ReadonlyMap<string, MemberDirectoryEntry>>;
  let permissions: WritableSignal<ReadonlyArray<string>>;
  let ensureLoaded: ReturnType<typeof vi.fn>;
  let directoryEnsureLoaded: ReturnType<typeof vi.fn>;

  function group(): HTMLElement | null {
    return fixture.nativeElement.querySelector('[data-slot="sidebar-group"]');
  }

  function text(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  async function navigateTo(url: string): Promise<void> {
    await TestBed.inject(Router).navigateByUrl(url);
    await fixture.whenStable();
  }

  beforeEach(async () => {
    rows = signal<readonly ConversationOutput[]>([conversation()]);
    directoryAvailable = signal<boolean>(true);
    directoryEntries = signal<ReadonlyMap<string, MemberDirectoryEntry>>(
      new Map<string, MemberDirectoryEntry>([
        [
          'member-9',
          { memberId: 'member-9', displayName: 'Amélie Rousseau', roleNames: [], isActive: true },
        ],
      ]),
    );
    permissions = signal<ReadonlyArray<string>>([
      ORGANIZATION_PERMISSION.MESSAGING_READ,
      ORGANIZATION_PERMISSION.MESSAGING_WRITE,
    ]);
    ensureLoaded = vi.fn();
    directoryEnsureLoaded = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([
          {
            path: 'organizations/:organizationId/messages',
            children: [{ path: ':conversationId', children: [] }],
          },
          { path: 'organizations/:organizationId/today', children: [] },
        ]),
        {
          provide: DirectConversationsStore,
          useValue: {
            rows,
            isLoading: signal(false),
            isOpening: signal(false),
            loadError: signal(null),
            ensureLoaded,
            load: vi.fn(),
            open: vi.fn(),
          },
        },
        {
          provide: MEMBER_DIRECTORY_PORT,
          useValue: {
            byId: directoryEntries,
            isAvailable: directoryAvailable,
            isLoading: signal(false),
            ensureLoaded: directoryEnsureLoaded,
            displayNameFor: (value: string): string => value,
          },
        },
        {
          provide: ORGANIZATION_MEMBER_ACCESS_PORT,
          useValue: {
            profile: signal({ id: 'member-1', organizationId: 'org-1' }),
            roles: signal([]),
            permissions,
            isLoadingAccess: signal(false),
            accessError: signal(null),
          },
        },
        {
          provide: ORGANIZATION_CONTEXT_PORT,
          useValue: {
            selectedOrganizationId: signal('org-1'),
            selectedOrganization: signal(null),
            isLoadingOrganization: signal(false),
          },
        },
      ],
    });

    fixture = TestBed.createComponent(DirectMessagesNav);
    await navigateTo('/organizations/org-1/messages');
  });

  afterEach(() => TestBed.resetTestingModule());

  it('should stay in the column away from the messages surface', async () => {
    await navigateTo('/organizations/org-1/today');

    expect(group()).not.toBeNull();
  });

  it('should render nothing for a member who may not read messages', async () => {
    permissions.set([]);
    await fixture.whenStable();

    expect(group()).toBeNull();
  });

  it('should honour a namespace wildcard grant', async () => {
    permissions.set(['organization.*']);
    await fixture.whenStable();

    expect(group()).not.toBeNull();
  });

  it('should load the conversations and the directory for the open organization', () => {
    expect(ensureLoaded).toHaveBeenCalledWith('/api/organizations/org-1');
    expect(directoryEnsureLoaded).toHaveBeenCalledWith('org-1');
  });

  it('should label a row from the member directory', () => {
    expect(text()).toContain('Amélie Rousseau');
  });

  it('should not print a member id when the directory cannot be read', async () => {
    directoryAvailable.set(false);
    await fixture.whenStable();

    expect(text()).toContain('Unknown member');
    expect(text()).not.toContain('member-9');
  });

  it('should address each conversation by its own URL', () => {
    const row: HTMLAnchorElement | null = fixture.nativeElement.querySelector(
      '[data-testid="direct-messages-nav-row"]',
    );

    expect(row?.getAttribute('href')).toBe('/organizations/org-1/messages/dc-1');
  });

  it('should offer to start a conversation only with the write permission', async () => {
    expect(
      fixture.nativeElement.querySelector('[data-testid="direct-messages-nav-new"]'),
    ).not.toBeNull();

    permissions.set([ORGANIZATION_PERMISSION.MESSAGING_READ]);
    await fixture.whenStable();

    expect(
      fixture.nativeElement.querySelector('[data-testid="direct-messages-nav-new"]'),
    ).toBeNull();
  });

  it('should not offer to start a conversation without a directory to pick from', async () => {
    directoryAvailable.set(false);
    await fixture.whenStable();

    // The picker would have nobody in it, and the control would only mislead.
    expect(
      fixture.nativeElement.querySelector('[data-testid="direct-messages-nav-new"]'),
    ).toBeNull();
  });

  it('should route to a conversation just opened from the picker', async () => {
    TestBed.inject(Dispatcher).dispatch(
      directConversationsStoreEvents.opened(conversation({ id: 'dc-2' })),
    );
    await fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/organizations/org-1/messages/dc-2');
  });
});
