import { LOCALE_ID, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { THEME_PORT, type ThemePort } from '@core/theme';
import type { InboxItemOutput } from '@features/account/models';
import { AccountInboxList } from '../account-inbox-list.component';

function inboxItem(overrides: Partial<InboxItemOutput> = {}): InboxItemOutput {
  return {
    sourceKey: 'notification',
    id: 'i-1',
    kind: 'intervention.assigned',
    title: 'An intervention was assigned to you',
    snippet: 'FG-101 at Rue Lafayette.',
    occurredAt: new Date(Date.now() - 3 * 3_600_000).toISOString(),
    isRead: false,
    organizationId: null,
    targetType: 'notification',
    targetId: 'i-1',
    targetKind: null,
    ...overrides,
  };
}

describe('AccountInboxList', () => {
  let fixture: ComponentFixture<AccountInboxList>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      // Pinned locale: relative timestamps are asserted in a known language.
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: LOCALE_ID, useValue: 'en-US' },
        {
          provide: THEME_PORT,
          useValue: {
            theme: signal('light'),
            resolvedTheme: signal('light'),
            setTheme: vi.fn(),
          } satisfies ThemePort,
        },
      ],
    });

    fixture = TestBed.createComponent(AccountInboxList);
    fixture.componentRef.setInput('items', []);
    fixture.componentRef.setInput('complete', true);
    await fixture.whenStable();
  });

  it('should show an empty state when nothing has arrived', () => {
    expect(fixture.nativeElement.textContent).toContain('No updates yet.');
  });

  it('should show skeletons rather than an empty state on the first fetch', async () => {
    fixture.componentRef.setInput('loading', true);
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).not.toContain('No updates yet.');
  });

  it('should list what it is given', async () => {
    fixture.componentRef.setInput('items', [inboxItem()]);
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('An intervention was assigned to you');
    expect(fixture.nativeElement.textContent).toContain('FG-101 at Rue Lafayette.');
  });

  it('should hide a legacy onboarding session UUID in the inbox preview', async () => {
    fixture.componentRef.setInput('items', [
      inboxItem({
        title: 'Your organization is ready!',
        snippet:
          'Congratulations! Your organization onboarding (session 01a0e27e-36d0-7b49-a1b5-649f2a321646) has been completed on 2026-09-27T10:57:25+00:00.',
      }),
    ]);
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('Your organization is ready!');
    expect(fixture.nativeElement.textContent).not.toContain('01a0e27e-36d0-7b49-a1b5-649f2a321646');
  });

  it('should render a relative timestamp with the exact one visible in mobile-ui', async () => {
    const item = inboxItem();
    fixture.componentRef.setInput('items', [item]);
    await fixture.whenStable();

    const time = fixture.nativeElement.querySelector('time') as HTMLTimeElement;

    expect(time.textContent).toContain('3 hours ago');
    expect(time.getAttribute('datetime')).toBe(item.occurredAt);
  });

  it('should mark an unread entry with a word, not only a tint', async () => {
    fixture.componentRef.setInput('items', [inboxItem()]);
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('Unread');
  });

  it('should separate entries from different days with a day heading', async () => {
    const today = inboxItem({ id: 'today', occurredAt: new Date().toISOString() });
    const yesterday = inboxItem({
      id: 'yesterday',
      occurredAt: new Date(Date.now() - 26 * 3_600_000).toISOString(),
    });
    fixture.componentRef.setInput('items', [today, yesterday]);
    await fixture.whenStable();

    const markers = fixture.nativeElement.querySelectorAll('[data-slot="marker"]');
    expect(markers).toHaveLength(2);
  });

  it('should not repeat a day heading for entries on the same day', async () => {
    const first = inboxItem({ id: 'first', occurredAt: new Date().toISOString() });
    const second = inboxItem({
      id: 'second',
      occurredAt: new Date(Date.now() - 3_600_000).toISOString(),
    });
    fixture.componentRef.setInput('items', [first, second]);
    await fixture.whenStable();

    const markers = fixture.nativeElement.querySelectorAll('[data-slot="marker"]');
    expect(markers).toHaveLength(1);
  });

  it('should offer a conversation link for a mention and a read control for a notification', async () => {
    const mention = inboxItem({
      id: 'mention-1',
      sourceKey: 'messaging.mention',
      targetType: 'conversation',
      targetKind: 'channel',
      organizationId: 'org-1',
    });
    const notification = inboxItem({ id: 'notification-1' });
    fixture.componentRef.setInput('items', [mention, notification]);
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('a')?.textContent).toContain('Open conversation');
    const buttons = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    );
    expect(buttons.some((button) => button.textContent?.includes('Mark as read'))).toBe(true);
  });

  it('should emit the item when its read control is used', async () => {
    const readRequested = vi.fn();
    fixture.componentInstance.readRequested.subscribe(readRequested);
    const item = inboxItem();
    fixture.componentRef.setInput('items', [item]);
    await fixture.whenStable();

    const buttons = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    );
    buttons
      .find((button): boolean => button.textContent?.includes('Mark as read') === true)
      ?.dispatchEvent(new Event('click'));
    await fixture.whenStable();

    expect(readRequested).toHaveBeenCalledWith(item);
  });

  it('should announce a partial feed without treating it as an error', async () => {
    fixture.componentRef.setInput('complete', false);
    await fixture.whenStable();

    const banner = fixture.nativeElement.querySelector('[data-testid="inbox-partial"]');
    expect(banner?.getAttribute('role')).toBe('status');
    expect(banner?.textContent).toContain('Some updates are missing');
  });

  it('should announce a refresh failure as an alert', async () => {
    fixture.componentRef.setInput('hasError', true);
    await fixture.whenStable();

    const banner = fixture.nativeElement.querySelector('[data-testid="inbox-partial"]');
    expect(banner?.getAttribute('role')).toBe('alert');
    expect(banner?.textContent).toContain("Couldn't refresh your inbox");
  });

  it('should surface a failed acknowledgement', async () => {
    fixture.componentRef.setInput('readFailed', true);
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain("Couldn't mark this as read");
  });

  it('should offer another page only when the server has one', async () => {
    fixture.componentRef.setInput('items', [inboxItem()]);
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).not.toContain('Load more');

    fixture.componentRef.setInput('hasMore', true);
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Load more');
  });
});
