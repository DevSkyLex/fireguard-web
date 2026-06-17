import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import type { TableLazyLoadEvent } from 'primeng/table';
import type { SessionOutput } from '@features/auth/models';
import { SessionTable } from '../session-table.component';

const MOCK_SESSION: SessionOutput = {
  '@id': '/api/sessions/session-1',
  '@type': 'Session',
  id: 'session-1',
  userId: 'user-1',
  ipAddress: '127.0.0.1',
  userAgent: 'Firefox',
  browser: 'Firefox',
  deviceType: 'desktop',
  createdAt: '2026-01-01T00:00:00Z',
  lastActivityAt: '2026-01-01T00:00:00Z',
  isActive: true,
  isCurrent: false,
};

describe('SessionTable', () => {
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
    sessions?: readonly SessionOutput[];
    total?: number;
    loading?: boolean;
    empty?: boolean;
  }) => {
    TestBed.configureTestingModule({ imports: [SessionTable] });

    const fixture = TestBed.createComponent(SessionTable);
    fixture.componentRef.setInput('sessions', overrides?.sessions ?? []);
    fixture.componentRef.setInput('total', overrides?.total ?? 0);
    fixture.componentRef.setInput('loading', overrides?.loading ?? false);
    fixture.componentRef.setInput('empty', overrides?.empty ?? true);
    fixture.componentRef.setInput('revokingAll', false);
    fixture.componentRef.setInput('hasOtherSessions', false);
    fixture.detectChanges();
    return fixture;
  };

  it('should render active session rows', () => {
    const fixture = createComponent({
      sessions: [MOCK_SESSION],
      total: 1,
      empty: false,
    });

    expect(fixture.nativeElement.textContent).toContain('Firefox');
    expect(fixture.nativeElement.textContent).toContain('127.0.0.1');
  });

  it('should render an empty message when there are no sessions', () => {
    const fixture = createComponent();

    expect(fixture.nativeElement.textContent).toContain('No active sessions');
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
    const fixture = createComponent({ sessions: [MOCK_SESSION], total: 11, empty: false });
    const spy = vi.fn();
    fixture.componentInstance.load.subscribe(spy);
    fixture.componentInstance.onLazyLoad({ first: 10, rows: 10 } as TableLazyLoadEvent);
    spy.mockClear();

    fixture.componentRef.setInput('total', 10);
    fixture.detectChanges();
    TestBed.flushEffects();

    expect(spy).toHaveBeenCalledWith({ page: 1, itemsPerPage: 10 });
  });

  it('should reload the first page when revoke-all leaves no loaded current session', () => {
    const fixture = createComponent({ sessions: [MOCK_SESSION], total: 2, empty: false });
    const spy = vi.fn();
    fixture.componentInstance.load.subscribe(spy);

    fixture.componentRef.setInput('sessions', []);
    fixture.componentRef.setInput('total', 1);
    fixture.detectChanges();
    TestBed.flushEffects();

    expect(spy).toHaveBeenCalledWith({ page: 1, itemsPerPage: 12 });
  });
});
