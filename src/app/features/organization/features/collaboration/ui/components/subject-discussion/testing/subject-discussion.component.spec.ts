import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ConversationService } from '@features/organization/features/collaboration/data-access';
import type { ConversationOutput } from '@features/organization/features/collaboration/models';
import { MessageThreadStore } from '@features/organization/features/collaboration/state';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import {
  MEMBER_DIRECTORY_PORT,
  ORGANIZATION_MEMBER_ACCESS_PORT,
} from '@features/organization/ports';
import { SubjectDiscussion } from '../subject-discussion.component';

function conversation(overrides: Partial<ConversationOutput> = {}): ConversationOutput {
  return {
    '@id': '/.well-known/genid/deadbeef',
    '@type': 'ConversationOutput',
    id: 'conversation-1',
    organization: '/api/organizations/org-1',
    subjectType: 'intervention',
    subject: '/api/interventions/intervention-1',
    visibility: 'subject',
    messagesCount: 0,
    isArchived: false,
    unreadCount: 0,
    createdAt: '2026-01-01T00:00:00+00:00',
    updatedAt: '2026-01-01T00:00:00+00:00',
    isChannel: false,
    isFavorite: false,
    ...overrides,
  } as ConversationOutput;
}

describe('SubjectDiscussion', () => {
  let fixture: ComponentFixture<SubjectDiscussion>;
  let thread: {
    reset: ReturnType<typeof vi.fn>;
    load: ReturnType<typeof vi.fn>;
    connect: ReturnType<typeof vi.fn>;
    markRead: ReturnType<typeof vi.fn>;
    send: ReturnType<typeof vi.fn>;
    loadOlder: ReturnType<typeof vi.fn>;
    retryFailed: ReturnType<typeof vi.fn>;
    toggleReaction: ReturnType<typeof vi.fn>;
    sortedMessages: ReturnType<typeof vi.fn>;
    pendingMessageIds: ReturnType<typeof vi.fn>;
    failedMessageIds: ReturnType<typeof vi.fn>;
    isLoading: ReturnType<typeof vi.fn>;
    isPosting: ReturnType<typeof vi.fn>;
    hasMore: ReturnType<typeof vi.fn>;
    loadError: ReturnType<typeof vi.fn>;
  };
  let openSubjectThread: ReturnType<typeof vi.fn>;
  let permissions: ReturnType<typeof signal<ReadonlyArray<string>>>;

  async function createComponent(): Promise<void> {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: ConversationService, useValue: { openSubjectThread } },
        {
          provide: MEMBER_DIRECTORY_PORT,
          useValue: {
            byId: signal(new Map()),
            isAvailable: signal(true),
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
      ],
    });

    TestBed.overrideComponent(SubjectDiscussion, {
      remove: { providers: [MessageThreadStore] },
      add: { providers: [{ provide: MessageThreadStore, useValue: thread }] },
    });

    fixture = TestBed.createComponent(SubjectDiscussion);
    fixture.componentRef.setInput('organizationId', 'org-1');
    fixture.componentRef.setInput('subjectType', 'intervention');
    fixture.componentRef.setInput('subjectId', 'intervention-1');
    await fixture.whenStable();
  }

  beforeEach(() => {
    thread = {
      reset: vi.fn(),
      load: vi.fn(),
      connect: vi.fn(),
      markRead: vi.fn(),
      send: vi.fn(),
      loadOlder: vi.fn(),
      retryFailed: vi.fn(),
      toggleReaction: vi.fn(),
      sortedMessages: vi.fn(() => []),
      pendingMessageIds: vi.fn(() => []),
      failedMessageIds: vi.fn(() => []),
      isLoading: vi.fn(() => false),
      isPosting: vi.fn(() => false),
      hasMore: vi.fn(() => false),
      loadError: vi.fn(() => null),
    };
    openSubjectThread = vi.fn().mockReturnValue(of(conversation()));
    permissions = signal<ReadonlyArray<string>>([ORGANIZATION_PERMISSION.MESSAGING_WRITE]);
  });

  afterEach(() => TestBed.resetTestingModule());

  it('does not open a thread while inactive', async () => {
    await createComponent();

    expect(openSubjectThread).not.toHaveBeenCalled();
    expect(thread.load).not.toHaveBeenCalled();
  });

  it('opens the subject thread once activated and wires the resolved conversation into the store', async () => {
    await createComponent();

    fixture.componentRef.setInput('active', true);
    await fixture.whenStable();

    expect(openSubjectThread).toHaveBeenCalledWith({
      organization: 'org-1',
      subjectType: 'intervention',
      subject: 'intervention-1',
    });
    expect(thread.reset).toHaveBeenCalled();
    expect(thread.load).toHaveBeenCalledWith('conversation-1');
    expect(thread.connect).toHaveBeenCalledWith('conversation-1');
    expect(thread.markRead).toHaveBeenCalledWith({ conversationId: 'conversation-1' });
  });

  it('does not repeat the get-or-create call for the same subject once already opened', async () => {
    await createComponent();

    fixture.componentRef.setInput('active', true);
    await fixture.whenStable();

    fixture.componentRef.setInput('active', false);
    await fixture.whenStable();
    fixture.componentRef.setInput('active', true);
    await fixture.whenStable();

    expect(openSubjectThread).toHaveBeenCalledTimes(1);
  });

  it('surfaces a failed get-or-create as a load error rather than throwing', async () => {
    openSubjectThread = vi.fn().mockReturnValue(throwError(() => new Error('boom')));

    await createComponent();
    fixture.componentRef.setInput('active', true);
    await fixture.whenStable();

    expect(fixture.componentInstance['loadErrorMessage']()).not.toBeNull();
    expect(thread.load).not.toHaveBeenCalled();
  });

  it('sends only once the conversation has resolved', async () => {
    await createComponent();

    fixture.componentInstance['send']('too early');
    expect(thread.send).not.toHaveBeenCalled();

    fixture.componentRef.setInput('active', true);
    await fixture.whenStable();

    fixture.componentInstance['send']('hello');
    expect(thread.send).toHaveBeenCalledWith({
      conversationId: 'conversation-1',
      input: { body: 'hello' },
    });
  });

  it('gates the composer on messaging.write', async () => {
    permissions.set([]);
    await createComponent();

    expect(fixture.componentInstance['canWrite']()).toBe(false);

    permissions.set([ORGANIZATION_PERMISSION.MESSAGING_WRITE]);
    await fixture.whenStable();

    expect(fixture.componentInstance['canWrite']()).toBe(true);
  });
});
