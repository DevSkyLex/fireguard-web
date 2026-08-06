import { LOCALE_ID, provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { NotificationOutput } from '@features/account/models';
import { AccountNotificationList } from '../account-notification-list.component';

function notification(overrides: Partial<NotificationOutput> = {}): NotificationOutput {
  return {
    '@id': '/api/notifications/n-1',
    '@type': 'Notification',
    id: 'n-1',
    type: 'intervention.assigned',
    category: 'interventions',
    subject: 'An intervention was assigned to you',
    body: 'FG-101 at Rue Lafayette.',
    channels: ['mercure'],
    payload: {},
    isRead: false,
    createdAt: new Date(Date.now() - 3 * 3_600_000).toISOString(),
    readAt: null,
    ...overrides,
  };
}

describe('AccountNotificationList', () => {
  let fixture: ComponentFixture<AccountNotificationList>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      // Pinned so the relative timestamps are asserted in a known language:
      // the component follows the app's locale, not the machine's.
      providers: [provideZonelessChangeDetection(), { provide: LOCALE_ID, useValue: 'en-US' }],
    });

    fixture = TestBed.createComponent(AccountNotificationList);
    await fixture.whenStable();
  });

  it('should show an empty state when nothing has arrived', () => {
    expect(fixture.nativeElement.textContent).toContain('Nothing here yet');
  });

  it('should show skeletons rather than an empty state on the first fetch', async () => {
    fixture.componentRef.setInput('loading', true);
    await fixture.whenStable();

    // "Nothing here yet" while the first page is still in flight would be a
    // claim the component cannot make.
    expect(fixture.nativeElement.textContent).not.toContain('Nothing here yet');
  });

  it('should list what it is given', async () => {
    fixture.componentRef.setInput('notifications', [notification()]);
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('An intervention was assigned to you');
    expect(fixture.nativeElement.textContent).toContain('FG-101 at Rue Lafayette.');
  });

  it('should mark an unread notification with a word, not only a tint', async () => {
    fixture.componentRef.setInput('notifications', [notification()]);
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('Unread');
  });

  it('should tint an unread row and leave a read one plain', async () => {
    fixture.componentRef.setInput('notifications', [notification()]);
    await fixture.whenStable();
    const unread = fixture.nativeElement.querySelector('li') as HTMLElement;

    // Asserted because the class list is built from two literal strings rather
    // than from `[class.x]` flags: an opacity modifier carries a `/`, which an
    // Angular binding name is not specified to hold.
    expect(unread.className).toContain('bg-muted/40');
    expect(unread.className).toContain('border-primary/40');

    fixture.componentRef.setInput('notifications', [notification({ isRead: true })]);
    await fixture.whenStable();
    const read = fixture.nativeElement.querySelector('li') as HTMLElement;

    expect(read.className).toContain('border-border');
    expect(read.className).not.toContain('bg-muted/40');
  });

  it('should render a relative timestamp with the exact one in the markup', async () => {
    const item = notification();
    fixture.componentRef.setInput('notifications', [item]);
    await fixture.whenStable();

    const time = fixture.nativeElement.querySelector('time') as HTMLTimeElement;

    expect(time.textContent).toContain('3 hours ago');
    expect(time.getAttribute('datetime')).toBe(item.createdAt);
  });

  it('should emit the id when an unread notification is read', async () => {
    const markedAsRead = vi.fn();
    fixture.componentInstance.markedAsRead.subscribe(markedAsRead);
    fixture.componentRef.setInput('notifications', [notification()]);
    await fixture.whenStable();

    const buttons = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    );
    buttons
      .find((button): boolean => button.textContent?.includes('Mark read') === true)
      ?.dispatchEvent(new Event('click'));
    await fixture.whenStable();

    expect(markedAsRead).toHaveBeenCalledWith('n-1');
  });

  it('should offer no read control on an already-read notification', async () => {
    fixture.componentRef.setInput('notifications', [notification({ isRead: true })]);
    await fixture.whenStable();

    const buttons = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    );

    // Re-reading one would fire a request that changes nothing.
    expect(
      buttons.some((button): boolean => button.textContent?.includes('Mark read') === true),
    ).toBe(false);
  });

  it('should emit the chosen category, and null for all of them', async () => {
    const categorySelected = vi.fn();
    fixture.componentInstance.categorySelected.subscribe(categorySelected);
    fixture.componentRef.setInput('categories', ['interventions', 'billing']);
    fixture.componentRef.setInput('activeCategory', 'interventions');
    await fixture.whenStable();

    const buttons = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    );
    buttons
      .find((button): boolean => button.textContent?.trim() === 'billing')
      ?.dispatchEvent(new Event('click'));
    buttons
      .find((button): boolean => button.textContent?.trim() === 'All')
      ?.dispatchEvent(new Event('click'));
    await fixture.whenStable();

    expect(categorySelected).toHaveBeenNthCalledWith(1, 'billing');
    expect(categorySelected).toHaveBeenNthCalledWith(2, null);
  });

  it('should offer a bulk clear only while something is unread', async () => {
    expect(
      fixture.nativeElement.querySelector('[data-testid="account-notifications-mark-all"]'),
    ).toBeNull();

    fixture.componentRef.setInput('unreadCount', 3);
    await fixture.whenStable();

    // A control that does nothing most of the time trains people to ignore it.
    expect(
      fixture.nativeElement.querySelector('[data-testid="account-notifications-mark-all"]'),
    ).not.toBeNull();
  });

  it('should emit the bulk clear', async () => {
    const allMarkedAsRead = vi.fn();
    fixture.componentInstance.allMarkedAsRead.subscribe(allMarkedAsRead);
    fixture.componentRef.setInput('unreadCount', 3);
    await fixture.whenStable();

    (
      fixture.nativeElement.querySelector(
        '[data-testid="account-notifications-mark-all"]',
      ) as HTMLButtonElement
    ).dispatchEvent(new Event('click'));
    await fixture.whenStable();

    expect(allMarkedAsRead).toHaveBeenCalled();
  });

  it('should disable the bulk clear while it is running', async () => {
    fixture.componentRef.setInput('unreadCount', 3);
    fixture.componentRef.setInput('markingAll', true);
    await fixture.whenStable();

    const button = fixture.nativeElement.querySelector(
      '[data-testid="account-notifications-mark-all"]',
    ) as HTMLButtonElement;

    expect(button.disabled).toBe(true);
  });

  it('should offer another page only when the server has one', async () => {
    fixture.componentRef.setInput('notifications', [notification()]);
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).not.toContain('Show older');

    fixture.componentRef.setInput('hasMore', true);
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Show older');
  });

  it('should keep the listed notifications visible when the fetch failed', async () => {
    fixture.componentRef.setInput('notifications', [notification()]);
    fixture.componentRef.setInput('hasError', true);
    await fixture.whenStable();

    // Wiping the feed to show an error loses what the user could still read.
    expect(fixture.nativeElement.textContent).toContain("Couldn't load your notifications");
    expect(fixture.nativeElement.textContent).toContain('An intervention was assigned to you');
  });
});
