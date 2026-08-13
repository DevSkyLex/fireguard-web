import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { MessageView } from '@features/organization/features/collaboration/models';
import { MessageThread } from '../message-thread.component';

function view(overrides: Partial<MessageView> = {}): MessageView {
  return {
    id: 'message-1',
    authorId: 'member-1',
    authorName: 'Amélie Rousseau',
    bodyHtml: '<p>Bonjour</p>',
    createdAt: new Date(2026, 0, 1, 9, 0).toISOString(),
    isDeleted: false,
    isOwn: false,
    status: 'sent',
    reactions: [],
    ...overrides,
  };
}

describe('MessageThread', () => {
  let fixture: ComponentFixture<MessageThread>;

  function text(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  function rowCount(): number {
    return fixture.nativeElement.querySelectorAll('app-message-row').length;
  }

  async function setMessages(messages: readonly MessageView[]): Promise<void> {
    fixture.componentRef.setInput('messages', messages);
    await fixture.whenStable();
  }

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(MessageThread);
    await setMessages([view()]);
  });

  it('should own the only scroller so the shell never takes over', () => {
    const scroller: HTMLElement | null = fixture.nativeElement.querySelector(
      '[data-testid="message-thread"]',
    );

    expect(scroller?.classList.contains('overflow-y-auto')).toBe(true);
    expect(scroller?.classList.contains('min-h-0')).toBe(true);
  });

  it('should rule the thread by calendar day', async () => {
    await setMessages([
      view({ id: 'a', createdAt: new Date(2026, 0, 1, 9, 0).toISOString() }),
      view({ id: 'b', createdAt: new Date(2026, 0, 2, 9, 0).toISOString() }),
    ]);

    expect(rowCount()).toBe(2);
    expect(text()).toContain('2026');
  });

  it('should say the conversation is empty rather than showing a blank pane', async () => {
    await setMessages([]);

    expect(text()).toContain('No messages yet');
  });

  it('should show a skeleton only while the first page is on its way', async () => {
    await setMessages([]);
    fixture.componentRef.setInput('loading', true);
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelectorAll('hlm-skeleton').length).toBeGreaterThan(0);
    expect(text()).not.toContain('No messages yet');
  });

  it('should surface a read failure instead of an empty conversation', async () => {
    fixture.componentRef.setInput('errorMessage', 'Network unreachable');
    await fixture.whenStable();

    expect(text()).toContain("Couldn't load this conversation");
    expect(rowCount()).toBe(0);
  });

  it('should offer to page in older history only when there is some', async () => {
    expect(
      fixture.nativeElement.querySelector('[data-testid="message-thread-load-more"]'),
    ).toBeNull();

    const asked: number[] = [];
    fixture.componentInstance.loadMore.subscribe(() => asked.push(1));

    fixture.componentRef.setInput('hasMore', true);
    await fixture.whenStable();

    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('[data-testid="message-thread-load-more"]')
      ?.click();

    expect(asked).toHaveLength(1);
  });

  it('should report catching up so the read marker can move', async () => {
    const caughtUp: number[] = [];
    fixture.componentInstance.caughtUp.subscribe(() => caughtUp.push(1));

    await setMessages([view(), view({ id: 'message-2' })]);

    expect(caughtUp.length).toBeGreaterThan(0);
  });

  function liveRegion(): HTMLElement | null {
    return (fixture.nativeElement as HTMLElement).querySelector(
      '[data-testid="message-thread-live-region"]',
    );
  }

  it('should announce a new incoming message in the live region', async () => {
    await setMessages([view(), view({ id: 'message-2', authorName: 'Léo Martin', isOwn: false })]);

    expect(liveRegion()?.textContent).toContain('Léo Martin');
  });

  it('should not announce a message the current member just sent', async () => {
    const beforeOwnMessage: string | null | undefined = liveRegion()?.textContent;

    await setMessages([view(), view({ id: 'message-2', authorName: 'Léo Martin', isOwn: true })]);

    expect(liveRegion()?.textContent).toBe(beforeOwnMessage);
    expect(liveRegion()?.textContent).not.toContain('Léo Martin');
  });
});
