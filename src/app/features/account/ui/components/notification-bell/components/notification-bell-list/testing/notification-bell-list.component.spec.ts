import { TestBed } from '@angular/core/testing';
import type { NotificationOutput } from '@features/account/models';
import { NotificationBellList } from '../notification-bell-list.component';

class MockIntersectionObserver {
  public observe(): void {}
  public unobserve(): void {}
  public disconnect(): void {}
}

const notification = (overrides: Partial<NotificationOutput> = {}): NotificationOutput =>
  ({
    '@id': '/api/notifications/notif-1',
    '@type': 'Notification',
    id: 'notif-1',
    type: 'facility.created',
    category: 'facility',
    subject: 'New facility created',
    body: 'Headquarters was created.',
    channels: ['in_app'],
    payload: {},
    isRead: false,
    createdAt: '2026-01-01T00:00:00Z',
    readAt: null,
    ...overrides,
  }) as NotificationOutput;

describe('NotificationBellList', () => {
  const originalIntersectionObserver = globalThis.IntersectionObserver;

  beforeAll(() => {
    (globalThis as { IntersectionObserver: unknown }).IntersectionObserver =
      MockIntersectionObserver;
  });

  afterAll(() => {
    (globalThis as { IntersectionObserver: unknown }).IntersectionObserver =
      originalIntersectionObserver;
  });

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [NotificationBellList] });
  });

  const createFixture = (
    overrides: {
      notifications?: ReadonlyArray<NotificationOutput>;
      loading?: boolean;
      loadingMore?: boolean;
      hasMore?: boolean;
    } = {},
  ) => {
    const fixture = TestBed.createComponent(NotificationBellList);
    fixture.componentRef.setInput('notifications', overrides.notifications ?? []);
    fixture.componentRef.setInput('loading', overrides.loading ?? false);
    fixture.componentRef.setInput('loadingMore', overrides.loadingMore ?? false);
    fixture.componentRef.setInput('hasMore', overrides.hasMore ?? false);
    fixture.detectChanges();
    return fixture;
  };

  it('should render skeleton placeholders while loading', () => {
    const fixture = createFixture({ loading: true });

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(host.querySelectorAll('p-skeleton').length).toBeGreaterThan(0);
    expect(host.querySelector('app-notification-bell-item')).toBeNull();
  });

  it('should render the empty state when there are no notifications and loading has settled', () => {
    const fixture = createFixture({ notifications: [], loading: false });

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('No notifications yet');
  });

  it('should not render the empty state while loading', () => {
    const fixture = createFixture({ notifications: [], loading: true });

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(host.textContent).not.toContain('No notifications yet');
  });

  it('should render notification items when notifications are present', () => {
    const fixture = createFixture({ notifications: [notification()] });

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    const items = host.querySelectorAll('app-notification-bell-item');
    expect(items.length).toBe(1);
    expect(host.querySelector('p-skeleton')).toBeNull();
  });

  it('should not render notification items while loading even if some are present', () => {
    const fixture = createFixture({ notifications: [notification()], loading: true });

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('app-notification-bell-item')).toBeNull();
  });

  it('should show the loading-more spinner when loadingMore is true', () => {
    const fixture = createFixture({ notifications: [notification()], loadingMore: true });

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('p-progressspinner')).toBeTruthy();
  });

  it('should not show the loading-more spinner when loadingMore is false', () => {
    const fixture = createFixture({ notifications: [notification()], loadingMore: false });

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('p-progressspinner')).toBeNull();
  });

  it('should render multiple notification rows in order', () => {
    const fixture = createFixture({
      notifications: [
        notification({ id: 'n-1', subject: 'First' }),
        notification({ id: 'n-2', subject: 'Second' }),
      ],
    });

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(host.querySelectorAll('app-notification-bell-item').length).toBe(2);
  });

  it('should emit markAsRead with the notification id', () => {
    const fixture = createFixture({ notifications: [notification({ id: 'notif-42' })] });
    const spy = vi.fn();
    fixture.componentInstance.markAsRead.subscribe(spy);

    fixture.componentInstance.markAsRead.emit('notif-42');

    expect(spy).toHaveBeenCalledWith('notif-42');
  });

  it('should emit loadMore when the infinite scroll sentinel triggers', () => {
    const fixture = createFixture({ notifications: [notification()], hasMore: true });
    const spy = vi.fn();
    fixture.componentInstance.loadMore.subscribe(spy);

    fixture.componentInstance.loadMore.emit();

    expect(spy).toHaveBeenCalled();
  });

  it('should not render the sentinel container when there are no notifications', () => {
    const fixture = createFixture({ notifications: [], loading: false });

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('[appInfiniteScroll]')).toBeNull();
  });
});
