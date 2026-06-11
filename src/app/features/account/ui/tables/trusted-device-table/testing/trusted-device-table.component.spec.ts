import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import type { TableLazyLoadEvent } from 'primeng/table';
import type { TrustedDeviceOutput } from '@features/auth/models';
import { TrustedDeviceTable } from '../trusted-device-table.component';

const MOCK_DEVICE: TrustedDeviceOutput = {
  '@id': '/api/trusted-devices/device-1',
  '@type': 'TrustedDevice',
  id: 'device-1',
  name: 'Work laptop',
  createdAt: '2026-01-01T00:00:00Z',
  lastUsedAt: '2026-01-02T00:00:00Z',
  expiresAt: '2026-07-01T00:00:00Z',
};

describe('TrustedDeviceTable', () => {
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
    devices?: readonly TrustedDeviceOutput[];
    total?: number;
    loading?: boolean;
    empty?: boolean;
  }) => {
    TestBed.configureTestingModule({ imports: [TrustedDeviceTable] });

    const fixture = TestBed.createComponent(TrustedDeviceTable);
    fixture.componentRef.setInput('devices', overrides?.devices ?? []);
    fixture.componentRef.setInput('total', overrides?.total ?? 0);
    fixture.componentRef.setInput('loading', overrides?.loading ?? false);
    fixture.componentRef.setInput('empty', overrides?.empty ?? true);
    fixture.componentRef.setInput('revokingAll', false);
    fixture.componentRef.setInput('hasDevices', false);
    fixture.detectChanges();
    return fixture;
  };

  it('should render trusted device rows', () => {
    const fixture = createComponent({
      devices: [MOCK_DEVICE],
      total: 1,
      empty: false,
    });

    expect(fixture.nativeElement.textContent).toContain('Work laptop');
  });

  it('should render an empty message when there are no trusted devices', () => {
    const fixture = createComponent();

    expect(fixture.nativeElement.textContent).toContain('No trusted devices');
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
