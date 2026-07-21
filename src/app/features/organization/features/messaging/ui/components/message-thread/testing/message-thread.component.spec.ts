import { signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { ENV_CONFIG } from '@core/config/environment';
import type { MessageOutput } from '@features/organization/features/messaging/models';
import { ORGANIZATION_CONTEXT_PORT } from '@features/organization/ports';
import { MessageThread } from '../message-thread.component';

const message = (id: string): MessageOutput =>
  ({
    '@id': `/api/messages/${id}`,
    '@type': 'Message',
    id,
    conversation: '/api/conversations/c1',
    authorMember: '/api/organization-members/member-1',
    body: `message ${id}`,
    mentions: [],
    editedAt: null,
    isDeleted: false,
    deletedAt: null,
    attachments: [],
    pinnedAt: null,
    pinnedBy: null,
    reactions: [],
    isSaved: false,
    replyCount: 0,
    createdAt: '2026-07-01T00:00:00Z',
    updatedAt: '2026-07-01T00:00:00Z',
  }) as MessageOutput;

// jsdom implements no `Element.scrollTo`, and the thread calls it to follow new
// messages. Supplied once for the file; the auto-scroll specs below still swap
// in their own spy per instance.
Object.defineProperty(Element.prototype, 'scrollTo', {
  value: (): void => undefined,
  writable: true,
  configurable: true,
});

/**
 * The thread follows its own arrivals — but only for a reader already at the
 * bottom. Scrolling someone back down while they read history is worse than
 * not scrolling at all, so both halves are pinned here.
 */
describe('MessageThread auto-scroll', () => {
  let fixture: ComponentFixture<MessageThread>;
  let scrollTo: ReturnType<typeof vi.fn>;

  const scroller = (): HTMLElement =>
    fixture.debugElement.query(By.css('[role="log"]')).nativeElement as HTMLElement;

  /** jsdom gives every element a zero box and no `scrollTo`; both are supplied. */
  const geometry = (scrollTop: number, scrollHeight: number, clientHeight: number): void => {
    const element: HTMLElement = scroller();
    Object.defineProperty(element, 'scrollHeight', { value: scrollHeight, configurable: true });
    Object.defineProperty(element, 'clientHeight', { value: clientHeight, configurable: true });
    element.scrollTop = scrollTop;
  };

  const arrive = (): void => {
    fixture.componentRef.setInput('messages', [message('m1'), message('m2')]);
    fixture.detectChanges();
    vi.runAllTimers();
  };

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      imports: [MessageThread],
      providers: [{ provide: ENV_CONFIG, useValue: { apiUrl: 'http://localhost' } }],
    });

    fixture = TestBed.createComponent(MessageThread);
    fixture.componentRef.setInput('messages', [message('m1')]);
    fixture.detectChanges();

    scrollTo = vi.fn();
    Object.defineProperty(scroller(), 'scrollTo', { value: scrollTo, configurable: true });

    // Opening a conversation legitimately scrolls to the newest message. Drain
    // that first pass so it is not mistaken for a reaction to the arrival each
    // test is actually about.
    vi.runAllTimers();
    scrollTo.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('follows a new message when the reader is at the bottom', () => {
    geometry(500, 600, 100);

    arrive();

    expect(scrollTo).toHaveBeenCalledWith({ top: 600, behavior: 'smooth' });
  });

  it('leaves a reader who scrolled up alone', () => {
    // 400px from the bottom with a 100px viewport: deliberately reading history.
    geometry(100, 600, 100);

    arrive();

    expect(scrollTo).not.toHaveBeenCalled();
  });
});

/**
 * Editing is the author's alone — the backend refuses it to anyone else
 * whatever their permissions — while deleting also reaches a moderator. Both
 * halves are pinned so the menu never offers an action that would 403.
 */
describe('MessageThread edit and delete', () => {
  let fixture: ComponentFixture<MessageThread>;

  const at = (testId: string): HTMLElement | null =>
    (fixture.debugElement.query(By.css(`[data-testid="${testId}"]`))?.nativeElement as
      | HTMLElement
      | undefined) ?? null;

  const render = (options: {
    readonly self: string | null;
    readonly canManage?: boolean;
    readonly deleted?: boolean;
  }): void => {
    fixture = TestBed.createComponent(MessageThread);
    fixture.componentRef.setInput('messages', [
      { ...message('m1'), isDeleted: options.deleted ?? false },
    ]);
    fixture.componentRef.setInput('currentMemberId', options.self);
    fixture.componentRef.setInput('canManageMessages', options.canManage ?? false);
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MessageThread],
      providers: [{ provide: ENV_CONFIG, useValue: { apiUrl: 'http://localhost' } }],
    });
  });

  it('offers nothing on someone else’s message without the manage permission', () => {
    render({ self: 'someone-else' });

    expect(at('message-more')).toBeNull();
  });

  it('offers delete but not edit to a moderator', () => {
    render({ self: 'someone-else', canManage: true });
    at('message-more')?.click();
    fixture.detectChanges();

    expect(at('message-delete')).not.toBeNull();
    // Editing is the author's alone, permission or not.
    expect(at('message-edit')).toBeNull();
  });

  it('offers both to the author', () => {
    render({ self: 'member-1' });
    at('message-more')?.click();
    fixture.detectChanges();

    expect(at('message-edit')).not.toBeNull();
    expect(at('message-delete')).not.toBeNull();
  });

  it('offers nothing on an already deleted message', () => {
    render({ self: 'member-1', canManage: true, deleted: true });

    expect(at('message-more')).toBeNull();
  });

  it('emits the rewritten body and closes the editor', () => {
    render({ self: 'member-1' });
    const edited = vi.fn();
    fixture.componentInstance.edited.subscribe(edited);

    at('message-more')?.click();
    fixture.detectChanges();
    at('message-edit')?.click();
    fixture.detectChanges();

    const field = fixture.debugElement.query(By.css('[data-testid="message-edit-form"] textarea'));
    // Seeded with the current body, so a small fix is not retyped whole.
    expect((field.nativeElement as HTMLTextAreaElement).value).toBe('message m1');

    field.nativeElement.value = 'corrected';
    field.nativeElement.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    at('message-edit-save')?.click();
    fixture.detectChanges();

    expect(edited).toHaveBeenCalledWith(expect.objectContaining({ body: 'corrected' }) as unknown);
    expect(at('message-edit-form')).toBeNull();
  });

  it('asks the page to delete rather than deleting itself', () => {
    render({ self: 'member-1' });
    const deleteRequested = vi.fn();
    fixture.componentInstance.deleteRequested.subscribe(deleteRequested);

    at('message-more')?.click();
    fixture.detectChanges();
    at('message-delete')?.click();
    fixture.detectChanges();

    expect(deleteRequested).toHaveBeenCalledTimes(1);
    // The menu closes: the confirmation belongs to the page.
    expect(at('message-more-menu')).toBeNull();
  });
});

/**
 * Record cards hang off the message like its attachments do. Two things must
 * hold: an absent `references` field (API Platform omits it) is not a crash,
 * and a tombstoned message shows none — a reference is content, redacted with
 * the body.
 */
describe('MessageThread references', () => {
  let fixture: ComponentFixture<MessageThread>;

  const render = (row: MessageOutput): void => {
    fixture = TestBed.createComponent(MessageThread);
    fixture.componentRef.setInput('messages', [row]);
    fixture.detectChanges();
  };

  const cards = (): readonly HTMLElement[] =>
    fixture.debugElement
      .queryAll(By.css('[data-testid="message-reference"]'))
      .map((debug) => debug.nativeElement as HTMLElement);

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MessageThread],
      providers: [
        provideRouter([]),
        { provide: ENV_CONFIG, useValue: { apiUrl: 'http://localhost' } },
        {
          provide: ORGANIZATION_CONTEXT_PORT,
          useValue: { selectedOrganization: signal({ id: 'org-1' }) },
        },
      ],
    });
  });

  it('renders one card per reference, under the body', () => {
    render({
      ...message('m1'),
      references: [
        { type: 'non_conformity', id: 'nc-1', code: 'FG-NC-231' },
        { type: 'facility', id: 'f-1', label: 'Tour Nord' },
      ],
    } as MessageOutput);

    expect(cards()).toHaveLength(2);
    expect(cards()[0]?.getAttribute('data-reference-type')).toBe('non_conformity');
  });

  // The field is omitted entirely on a message that carries none — reading it
  // as `=== null` would let `undefined` through and blow up the `@for`.
  it('renders nothing when the payload omits references', () => {
    render(message('m1'));

    expect(cards()).toHaveLength(0);
  });

  it('renders nothing for a tombstoned message', () => {
    render({ ...message('m1'), isDeleted: true, body: null, references: [] } as MessageOutput);

    expect(cards()).toHaveLength(0);
  });

  // A delete derived locally keeps the payload it was built from; the thread
  // must still read like the reload would.
  it('drops the cards of a message deleted locally', () => {
    render({
      ...message('m1'),
      isDeleted: true,
      body: null,
      references: [{ type: 'equipment', id: 'e-1' }],
    } as MessageOutput);

    expect(cards()).toHaveLength(0);
  });
});
