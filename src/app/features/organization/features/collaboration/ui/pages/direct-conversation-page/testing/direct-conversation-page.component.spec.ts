import { provideZonelessChangeDetection, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
  DirectConversationsStore,
  MessageThreadStore,
} from '@features/organization/features/collaboration/state';
import type { MemberDirectoryEntry } from '@features/organization/models';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import {
  MEMBER_DIRECTORY_PORT,
  ORGANIZATION_CONTEXT_PORT,
  ORGANIZATION_MEMBER_ACCESS_PORT,
} from '@features/organization/ports';
import { DirectConversationPage } from '../direct-conversation-page.component';

const COUNTERPART_IRI = '/api/organizations/org-1/members/member-9';

function directoryEntry(overrides: Partial<MemberDirectoryEntry> = {}): MemberDirectoryEntry {
  return {
    memberId: 'member-9',
    displayName: 'Amélie Rousseau',
    roleNames: [],
    isActive: true,
    ...overrides,
  };
}

describe('DirectConversationPage', () => {
  let fixture: ComponentFixture<DirectConversationPage>;
  let thread: {
    reset: ReturnType<typeof vi.fn>;
    load: ReturnType<typeof vi.fn>;
    connect: ReturnType<typeof vi.fn>;
    markRead: ReturnType<typeof vi.fn>;
    send: ReturnType<typeof vi.fn>;
    loadOlder: ReturnType<typeof vi.fn>;
    retryFailed: ReturnType<typeof vi.fn>;
    sortedMessages: ReturnType<typeof vi.fn>;
    pendingMessageIds: ReturnType<typeof vi.fn>;
    failedMessageIds: ReturnType<typeof vi.fn>;
    isLoading: ReturnType<typeof vi.fn>;
    isPosting: ReturnType<typeof vi.fn>;
    hasMore: ReturnType<typeof vi.fn>;
    loadError: ReturnType<typeof vi.fn>;
  };
  let counterpart: string | undefined;
  let directoryAvailable: WritableSignal<boolean>;
  let directoryEntries: WritableSignal<ReadonlyMap<string, MemberDirectoryEntry>>;
  let permissions: WritableSignal<ReadonlyArray<string>>;

  function headerName(): string {
    return (
      fixture.nativeElement
        .querySelector('[data-testid="direct-conversation-name"]')
        ?.textContent?.trim() ?? ''
    );
  }

  async function createPage(): Promise<void> {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        {
          provide: DirectConversationsStore,
          useValue: { counterpartFor: (): string | undefined => counterpart },
        },
        {
          provide: MEMBER_DIRECTORY_PORT,
          useValue: {
            byId: directoryEntries,
            isAvailable: directoryAvailable,
            isLoading: signal(false),
            ensureLoaded: vi.fn(),
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

    // The page provides the thread store, so a module-level one never reaches it.
    TestBed.overrideComponent(DirectConversationPage, {
      remove: { providers: [MessageThreadStore] },
      add: { providers: [{ provide: MessageThreadStore, useValue: thread }] },
    });

    fixture = TestBed.createComponent(DirectConversationPage);
    fixture.componentRef.setInput('conversationId', 'dc-1');
    await fixture.whenStable();
  }

  beforeEach(() => {
    counterpart = COUNTERPART_IRI;
    directoryAvailable = signal<boolean>(true);
    directoryEntries = signal<ReadonlyMap<string, MemberDirectoryEntry>>(
      new Map<string, MemberDirectoryEntry>([['member-9', directoryEntry()]]),
    );
    permissions = signal<ReadonlyArray<string>>([ORGANIZATION_PERMISSION.MESSAGING_WRITE]);
    thread = {
      reset: vi.fn(),
      load: vi.fn(),
      connect: vi.fn(),
      markRead: vi.fn(),
      send: vi.fn(),
      loadOlder: vi.fn(),
      retryFailed: vi.fn(),
      sortedMessages: vi.fn(() => []),
      pendingMessageIds: vi.fn(() => []),
      failedMessageIds: vi.fn(() => []),
      isLoading: vi.fn(() => false),
      isPosting: vi.fn(() => false),
      hasMore: vi.fn(() => false),
      loadError: vi.fn(() => null),
    };
  });

  afterEach(() => TestBed.resetTestingModule());

  it('should empty the thread before reading the routed conversation', async () => {
    await createPage();

    // The router reuses this component, so the store it provides is not fresh.
    expect(thread.reset).toHaveBeenCalled();
    expect(thread.load).toHaveBeenCalledWith('dc-1');
    expect(thread.connect).toHaveBeenCalledWith('dc-1');
    expect(thread.markRead).toHaveBeenCalledWith({ conversationId: 'dc-1' });
  });

  it('should re-run the whole sequence when another conversation is routed to', async () => {
    await createPage();
    fixture.componentRef.setInput('conversationId', 'dc-2');
    await fixture.whenStable();

    expect(thread.reset).toHaveBeenCalledTimes(2);
    expect(thread.load).toHaveBeenLastCalledWith('dc-2');
  });

  it('should name the counterpart from the directory', async () => {
    await createPage();

    expect(headerName()).toBe('Amélie Rousseau');
  });

  it('should not print a member id when the conversation is not in the loaded list', async () => {
    counterpart = undefined;

    await createPage();

    expect(headerName()).toBe('Unknown member');
  });

  it('should not print a member id when the directory cannot be read', async () => {
    directoryAvailable.set(false);

    await createPage();

    // Messaging permissions do not imply `members.read`: a normal state.
    expect(headerName()).toBe('Unknown member');
  });

  it('should not print a member id when the directory has not loaded the member', async () => {
    directoryEntries.set(new Map<string, MemberDirectoryEntry>());

    await createPage();

    expect(headerName()).toBe('Unknown member');
  });

  it('should let the composer write when messaging writes are granted', async () => {
    await createPage();

    expect(
      fixture.nativeElement.querySelector('[data-testid="message-composer-input"]'),
    ).not.toBeNull();
  });

  it('should hold the composer back on read-only access', async () => {
    permissions.set([ORGANIZATION_PERMISSION.MESSAGING_READ]);

    await createPage();

    // `.write` is not implied by `.read`, and the route guard only checks read.
    expect(
      fixture.nativeElement.querySelector('[data-testid="message-composer-read-only"]'),
    ).not.toBeNull();
  });

  it('should honour a namespace wildcard grant', async () => {
    permissions.set(['organization.*']);

    await createPage();

    expect(
      fixture.nativeElement.querySelector('[data-testid="message-composer-input"]'),
    ).not.toBeNull();
  });
});
