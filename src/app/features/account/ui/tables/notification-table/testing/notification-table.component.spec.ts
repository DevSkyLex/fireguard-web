import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import type { TableLazyLoadEvent } from 'primeng/table';
import type { NotificationOutput } from '@features/account/models';
import { NotificationTable } from '../notification-table.component';

const MOCK_NOTIFICATION: NotificationOutput = {
  '@id': '/api/notifications/notification-1',
  '@type': 'Notification',
  id: 'notification-1',
  type: 'alert',
  category: 'security',
  subject: 'Security alert',
  body: 'A new sign-in was detected.',
  channels: ['in_app'],
  payload: {},
  isRead: false,
  createdAt: '2026-01-01T00:00:00Z',
  readAt: null,
};

describe('NotificationTable', () => {
  beforeAll(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  const createComponent = (overrides?: {
    notifications?: readonly NotificationOutput[];
    total?: number;
    loading?: boolean;
    empty?: boolean;
    unreadCount?: number;
  }) => {
    TestBed.configureTestingModule({ imports: [NotificationTable] });

    const fixture = TestBed.createComponent(NotificationTable);
    fixture.componentRef.setInput('notifications', overrides?.notifications ?? []);
    fixture.componentRef.setInput('total', overrides?.total ?? 0);
    fixture.componentRef.setInput('loading', overrides?.loading ?? false);
    fixture.componentRef.setInput('empty', overrides?.empty ?? true);
    fixture.componentRef.setInput('unreadCount', overrides?.unreadCount ?? 0);
    fixture.detectChanges();
    return fixture;
  };

  it('should render notification rows', () => {
    const fixture = createComponent({
      notifications: [MOCK_NOTIFICATION],
      total: 1,
      empty: false,
      unreadCount: 1,
    });

    expect(fixture.nativeElement.textContent).toContain('Security alert');
    expect(fixture.nativeElement.textContent).toContain('A new sign-in was detected.');
  });

  it('should render an empty message when there are no notifications', () => {
    const fixture = createComponent();

    expect(fixture.nativeElement.textContent).toContain('No notifications yet');
  });

  it('should show skeleton placeholders while loading', () => {
    const fixture = createComponent({ loading: true });

    expect(fixture.debugElement.query(By.css('.p-skeleton'))).toBeTruthy();
  });

  it('should emit a load request with the resolved page', () => {
    const fixture = createComponent();
    const spy = vi.fn();
    fixture.componentInstance.load.subscribe(spy);

    fixture.componentInstance.onLazyLoad({ first: 20, rows: 10 } as TableLazyLoadEvent);

    expect(spy).toHaveBeenCalledWith({ page: 3, itemsPerPage: 10 });
  });

  it('should reload the last valid page when the current page becomes empty', () => {
    const fixture = createComponent({ total: 11, empty: false });
    const spy = vi.fn();
    fixture.componentInstance.load.subscribe(spy);
    fixture.componentInstance.onLazyLoad({ first: 10, rows: 10 } as TableLazyLoadEvent);
    spy.mockClear();

    fixture.componentRef.setInput('total', 10);
    fixture.detectChanges();
    TestBed.flushEffects();

    expect(spy).toHaveBeenCalledWith({ page: 1, itemsPerPage: 10 });
  });
});
