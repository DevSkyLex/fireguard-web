import { PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ConnectivityService } from '@core/connectivity';
import { THEME_PORT } from '@core/theme';
import { OrganizationPermissionService } from '@features/organization/access';
import { CustomerService } from '@features/organization/features/customers/data-access';
import { CustomersPage } from '../customers-page.component';

describe('CustomersPage', () => {
  beforeAll(() => {
    globalThis.ResizeObserver ??= class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    } as unknown as typeof ResizeObserver;
  });
  it('loads active customer pages and switches to the archived server universe', async () => {
    const service = { list: vi.fn().mockReturnValue(of({ member: [], totalItems: 0 })) };
    TestBed.configureTestingModule({
      imports: [CustomersPage],
      providers: [
        { provide: CustomerService, useValue: service },
        { provide: THEME_PORT, useValue: { resolvedTheme: signal('light') } },
        { provide: OrganizationPermissionService, useValue: { hasPermission: () => true } },
        { provide: ConnectivityService, useValue: { isOnline: signal(true) } },
      ],
    });
    const fixture = TestBed.createComponent(CustomersPage);
    fixture.componentRef.setInput('organizationId', 'org');
    await fixture.whenStable();
    expect(service.list).toHaveBeenLastCalledWith(
      'org',
      expect.objectContaining({ params: { archived: false } }),
    );
    const page = fixture.componentInstance as unknown as {
      archiveFilter: (value: unknown) => void;
    };
    page.archiveFilter('archived');
    await fixture.whenStable();
    expect(service.list).toHaveBeenLastCalledWith(
      'org',
      expect.objectContaining({ params: { archived: true } }),
    );
    expect(fixture.nativeElement.textContent).toContain('No customers in this view');
  });
  it('does not read customer data during SSR or without read permission', async () => {
    const service = { list: vi.fn() };
    TestBed.configureTestingModule({
      imports: [CustomersPage],
      providers: [
        { provide: PLATFORM_ID, useValue: 'server' },
        { provide: CustomerService, useValue: service },
        { provide: THEME_PORT, useValue: { resolvedTheme: signal('light') } },
        { provide: OrganizationPermissionService, useValue: { hasPermission: () => false } },
        { provide: ConnectivityService, useValue: { isOnline: signal(true) } },
      ],
    });
    const fixture = TestBed.createComponent(CustomersPage);
    fixture.componentRef.setInput('organizationId', 'org');
    await fixture.whenStable();
    expect(service.list).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).not.toContain('New customer');
  });
});
