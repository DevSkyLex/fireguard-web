import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of, throwError } from 'rxjs';
import { ConnectivityService } from '@core/connectivity';
import type { StoreError } from '@core/request-state';
import { ConversationService } from '@features/organization/features/collaboration/data-access';
import type { ConversationOutput } from '@features/organization/features/collaboration/models';
import { MessageThreadStore } from '@features/organization/features/collaboration/state';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import {
  MEMBER_DIRECTORY_PORT,
  ORGANIZATION_MEMBER_ACCESS_PORT,
} from '@features/organization/ports';
import { MessageComposer } from '../../../forms/message-composer';
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
  let isOffline: ReturnType<typeof vi.fn>;

  async function createComponent(): Promise<void> {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: ConversationService, useValue: { openSubjectThread } },
        { provide: ConnectivityService, useValue: { isOffline } },
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
    isOffline = vi.fn(() => false);
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

  it('labels a failed open as offline when the browser has no connectivity', async () => {
    openSubjectThread = vi.fn().mockReturnValue(throwError(() => new Error('boom')));
    isOffline = vi.fn(() => true);

    await createComponent();
    fixture.componentRef.setInput('active', true);
    await fixture.whenStable();

    expect(fixture.componentInstance['loadErrorMessage']()).toContain("You're offline");
  });

  it('labels a failed open with a generic message while online', async () => {
    openSubjectThread = vi.fn().mockReturnValue(throwError(() => new Error('boom')));
    isOffline = vi.fn(() => false);

    await createComponent();
    fixture.componentRef.setInput('active', true);
    await fixture.whenStable();

    expect(fixture.componentInstance['loadErrorMessage']()).toBe(
      'The discussion could not be opened.',
    );
  });

  it('does not memoize a failed open, so re-activating the same subject retries the get-or-create call', async () => {
    openSubjectThread = vi.fn().mockReturnValue(throwError(() => new Error('boom')));

    await createComponent();
    fixture.componentRef.setInput('active', true);
    await fixture.whenStable();

    expect(openSubjectThread).toHaveBeenCalledTimes(1);

    fixture.componentRef.setInput('active', false);
    await fixture.whenStable();
    fixture.componentRef.setInput('active', true);
    await fixture.whenStable();

    expect(openSubjectThread).toHaveBeenCalledTimes(2);
  });

  it('retries the get-or-create call when the reader presses retry after an open failure', async () => {
    openSubjectThread = vi.fn().mockReturnValue(throwError(() => new Error('boom')));

    await createComponent();
    fixture.componentRef.setInput('active', true);
    await fixture.whenStable();

    expect(openSubjectThread).toHaveBeenCalledTimes(1);

    openSubjectThread.mockReturnValue(of(conversation()));
    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('[data-testid="message-thread-retry"]')
      ?.click();
    await fixture.whenStable();

    expect(openSubjectThread).toHaveBeenCalledTimes(2);
    expect(thread.load).toHaveBeenCalledWith('conversation-1');
  });

  it('retries the thread read, not the get-or-create call, once the subject already opened', async () => {
    const readFailure: StoreError = {
      error: new Error('boom'),
      message: 'Network unreachable',
      code: null,
      retryable: true,
      timestamp: Date.now(),
    };
    thread.loadError = vi.fn(() => readFailure);

    await createComponent();
    fixture.componentRef.setInput('active', true);
    await fixture.whenStable();

    expect(openSubjectThread).toHaveBeenCalledTimes(1);
    expect(thread.load).toHaveBeenCalledTimes(1);

    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('[data-testid="message-thread-retry"]')
      ?.click();
    await fixture.whenStable();

    expect(openSubjectThread).toHaveBeenCalledTimes(1);
    expect(thread.load).toHaveBeenCalledTimes(2);
    expect(thread.load).toHaveBeenLastCalledWith('conversation-1');
  });

  it('forwards composerAutoFocus to the composer untouched', async () => {
    await createComponent();
    fixture.componentRef.setInput('composerAutoFocus', true);
    await fixture.whenStable();

    const composer = fixture.debugElement.query(By.directive(MessageComposer));

    expect((composer.componentInstance as MessageComposer).autoFocus()).toBe(true);
  });

  it('reports dirty once the composer holds a draft', async () => {
    await createComponent();
    fixture.componentRef.setInput('active', true);
    await fixture.whenStable();

    const dirty: boolean[] = [];
    fixture.componentInstance.dirtyChanged.subscribe((value: boolean) => dirty.push(value));

    const field = (fixture.nativeElement as HTMLElement).querySelector<HTMLTextAreaElement>(
      '[data-testid="message-composer-input"]',
    );
    if (field === null) throw new Error('The composer has no field.');
    field.value = 'Bien reçu.';
    field.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    expect(dirty).toContain(true);
  });

  it('reports dirty while a send is in flight, independent of the draft', async () => {
    thread.isPosting = vi.fn(() => true);

    await createComponent();
    fixture.componentRef.setInput('active', true);
    await fixture.whenStable();

    const dirty: boolean[] = [];
    fixture.componentInstance.dirtyChanged.subscribe((value: boolean) => dirty.push(value));

    // The effect only re-reads `isPosting` when `draftDirty` changes, so a keystroke drives it.
    const field = (fixture.nativeElement as HTMLElement).querySelector<HTMLTextAreaElement>(
      '[data-testid="message-composer-input"]',
    );
    if (field === null) throw new Error('The composer has no field.');
    field.value = 'x';
    field.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    expect(dirty[dirty.length - 1]).toBe(true);
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
