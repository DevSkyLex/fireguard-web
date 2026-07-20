import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ENV_CONFIG } from '@core/config/environment';
import type { MessageOutput } from '@features/organization/features/messaging/models';
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
