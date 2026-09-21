import {
  LOCALE_ID,
  computed,
  provideZonelessChangeDetection,
  signal,
  type WritableSignal,
} from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { INTERACTION_CAPABILITIES_PORT } from '@core/interaction-capabilities';
import type { StoreError } from '@core/request-state';
import type { InboxItemOutput } from '@features/account/models';
import { InboxStore } from '@features/account/state';
import { NotificationBell } from '../notification-bell.component';

const UNREAD: InboxItemOutput = {
  sourceKey: 'notification',
  id: '1',
  kind: 'notification',
  title: 'An intervention was assigned to you',
  snippet: 'Boiler room, tomorrow morning.',
  isRead: false,
  occurredAt: '2026-08-30T08:00:00+00:00',
  organizationId: 'org-1',
  targetType: 'notification',
  targetId: '1',
  targetKind: null,
};
const READ: InboxItemOutput = { ...UNREAD, id: '2', isRead: true };

describe('NotificationBell', () => {
  const mobile = signal(false);
  let fixture: ComponentFixture<NotificationBell>;
  let store: {
    complete: WritableSignal<boolean>;
    readCallState: () => { status: string };
    load: ReturnType<typeof vi.fn>;
    markAsRead: ReturnType<typeof vi.fn>;
    entryEntities: WritableSignal<ReadonlyArray<InboxItemOutput>>;
    isLoading: WritableSignal<boolean>;
    unreadCount: WritableSignal<number>;
    hasUnread: WritableSignal<boolean>;
    listError: WritableSignal<StoreError | null>;
  };

  const trigger = (): HTMLButtonElement =>
    fixture.nativeElement.querySelector('[data-testid="notification-bell-trigger"]');

  const dot = (): HTMLElement | null =>
    fixture.nativeElement.querySelector('[data-testid="notification-bell-dot"]');

  const panel = (): {
    onPanelState(state: 'closed' | 'open'): void;
    markRead(notification: InboxItemOutput): void;
  } =>
    fixture.componentInstance as unknown as {
      onPanelState(state: 'closed' | 'open'): void;
      markRead(notification: InboxItemOutput): void;
    };

  beforeEach(async () => {
    store = {
      complete: signal(true),
      readCallState: () => ({ status: 'idle' }),
      load: vi.fn(),
      markAsRead: vi.fn(),
      entryEntities: signal<ReadonlyArray<InboxItemOutput>>([]),
      isLoading: signal(false),
      unreadCount: signal(0),
      hasUnread: signal(false),
      listError: signal<StoreError | null>(null),
    };

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: LOCALE_ID, useValue: 'en-US' },
        { provide: InboxStore, useValue: store },
      ],
    });

    mobile.set(false);
    TestBed.overrideProvider(INTERACTION_CAPABILITIES_PORT, {
      useValue: {
        isMobileInteractionMode: mobile,
        mode: computed(() => (mobile() ? 'mobile' : 'desktop')),
      },
    });
    fixture = TestBed.createComponent(NotificationBell);
    await fixture.whenStable();
  });

  it('should hide the dot when nothing is unread', () => {
    expect(dot()).toBeNull();
  });

  it('should show the dot from the inbox count, not from the loaded entities', async () => {
    // `hasUnread` is derived from entities that are not loaded until the menu
    // has been opened once; only `unreadCount` is primed at boot.
    store.hasUnread.set(false);
    store.unreadCount.set(3);
    await fixture.whenStable();

    expect(dot()).not.toBeNull();
  });

  it('should carry the count in the accessible name so the dot is not the only signal', async () => {
    store.unreadCount.set(3);
    await fixture.whenStable();

    expect(trigger().getAttribute('aria-label')).toContain('3');
  });

  it('should cap the accessible count at 99+', async () => {
    store.unreadCount.set(140);
    await fixture.whenStable();

    expect(trigger().getAttribute('aria-label')).toContain('99+');
  });

  it('should fetch the feed the first time the panel is opened', () => {
    panel().onPanelState('open');

    expect(store.load).toHaveBeenCalledTimes(1);
  });

  it('should not fetch when the panel closes', () => {
    panel().onPanelState('closed');

    expect(store.load).not.toHaveBeenCalled();
  });

  it('should not refetch a feed the account provider already primed', async () => {
    store.entryEntities.set([UNREAD]);
    await fixture.whenStable();

    panel().onPanelState('open');

    expect(store.load).not.toHaveBeenCalled();
  });

  it('should not fetch while a request is already in flight', async () => {
    store.isLoading.set(true);
    await fixture.whenStable();

    panel().onPanelState('open');

    expect(store.load).not.toHaveBeenCalled();
  });

  it('should mark an unread notification read', () => {
    panel().markRead(UNREAD);

    expect(store.markAsRead).toHaveBeenCalledWith(UNREAD);
  });

  it('should not re-mark a notification that is already read', () => {
    panel().markRead(READ);

    expect(store.markAsRead).not.toHaveBeenCalled();
  });

  it('opens channel mentions without calling the notification acknowledgement endpoint', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    panel().onPanelState('open');
    panel().markRead({
      ...UNREAD,
      sourceKey: 'messaging.mention',
      targetType: 'conversation',
      targetId: 'channel-1',
      targetKind: 'channel',
    });
    await fixture.whenStable();
    expect(navigate).toHaveBeenCalledWith(['/organizations', 'org-1', 'channels', 'channel-1']);
    expect(store.markAsRead).not.toHaveBeenCalled();
    expect(fixture.componentInstance['panelState']()).toBe('closed');
  });

  it('announces a partial source and does not render a complete empty state', async () => {
    mobile.set(true);
    store.complete.set(false);
    await fixture.whenStable();
    trigger().click();
    await fixture.whenStable();
    const content = document.querySelector('hlm-drawer-content')?.textContent;
    expect(content).toContain('Some updates are unavailable');
    expect(content).not.toContain('Nothing here yet');
  });
  it('marks notifications read inside the mobile drawer without closing it', async () => {
    mobile.set(true);
    store.entryEntities.set([UNREAD]);
    await fixture.whenStable();
    trigger().click();
    await fixture.whenStable();
    const drawer = document.querySelector('hlm-drawer-content');
    expect(drawer).not.toBeNull();
    drawer?.querySelector<HTMLButtonElement>('[data-testid="notification-bell-item"]')?.click();
    await fixture.whenStable();
    expect(store.markAsRead).toHaveBeenCalledWith(UNREAD);
    expect(document.querySelector('hlm-drawer-content')).not.toBeNull();
    expect(store.load).not.toHaveBeenCalled();
  });

  it('loads through the same lazy path when the mobile drawer first opens', async () => {
    mobile.set(true);
    await fixture.whenStable();
    expect(store.load).not.toHaveBeenCalled();
    trigger().click();
    await fixture.whenStable();
    expect(store.load).toHaveBeenCalledTimes(1);
  });

  it('announces unread status without claiming that every unread item is current', async () => {
    mobile.set(true);
    store.entryEntities.set([UNREAD, READ]);
    await fixture.whenStable();
    trigger().click();
    await fixture.whenStable();
    const items = document.querySelectorAll<HTMLElement>('[data-testid="notification-bell-item"]');
    expect(items).toHaveLength(2);
    expect(items[0].hasAttribute('aria-current')).toBe(false);
    expect(items[0].querySelector('.sr-only')?.textContent).toContain('Unread');
    expect(items[1].querySelector('.sr-only')).toBeNull();
  });

  it('keeps the centre destination as a link and explicitly closes its mobile drawer', async () => {
    mobile.set(true);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    await fixture.whenStable();
    trigger().click();
    await fixture.whenStable();
    const link = document.querySelector<HTMLAnchorElement>('hlm-drawer-content a');
    expect(link?.getAttribute('href')).toBe('/account/notifications');
    link?.click();
    await fixture.whenStable();
    expect(navigate).toHaveBeenCalledOnce();
    expect(document.querySelector('hlm-drawer-content')).toBeNull();
  });
});
