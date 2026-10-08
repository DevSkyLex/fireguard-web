import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { CustomerService } from '@features/organization/features/customers/data-access';
import type { CustomerOutput } from '@features/organization/features/customers/models';
import { CustomerPicker } from '../customer-picker.component';

describe('CustomerPicker', () => {
  beforeAll(() => {
    globalThis.ResizeObserver ??= class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    } as unknown as typeof ResizeObserver;
  });
  const archived: CustomerOutput = {
    '@id': 'customer',
    '@type': 'Customer',
    id: 'customer',
    organizationId: 'org',
    name: 'Hospital',
    contacts: [],
    revision: 1,
    createdAt: '2026-10-06T10:00:00Z',
    updatedAt: '2026-10-06T10:00:00Z',
    archivedAt: '2026-10-06T11:00:00Z',
  };
  it('does not read secondary authenticated data on the server', async () => {
    const service = { list: vi.fn(), get: vi.fn() };
    TestBed.configureTestingModule({
      imports: [CustomerPicker],
      providers: [
        { provide: PLATFORM_ID, useValue: 'server' },
        { provide: CustomerService, useValue: service },
      ],
    });
    const fixture = TestBed.createComponent(CustomerPicker);
    fixture.componentRef.setInput('organizationId', 'org');
    fixture.componentRef.setInput('value', 'customer');
    await fixture.whenStable();
    expect(service.list).not.toHaveBeenCalled();
    expect(service.get).not.toHaveBeenCalled();
  });
  it('retains an archived label outside pages but refuses archived new assignments', async () => {
    const service = {
      list: vi.fn().mockReturnValue(of({ member: [], totalItems: 0 })),
      get: vi.fn().mockReturnValue(of(archived)),
    };
    TestBed.configureTestingModule({
      imports: [CustomerPicker],
      providers: [{ provide: CustomerService, useValue: service }],
    });
    const fixture = TestBed.createComponent(CustomerPicker);
    fixture.componentRef.setInput('organizationId', 'org');
    fixture.componentRef.setInput('value', 'customer');
    await fixture.whenStable();
    const picker = fixture.componentInstance as unknown as {
      selectedLabel: () => string;
      pick: (value: unknown) => void;
    };
    expect(picker.selectedLabel()).toBe('Hospital (archived)');
    picker.pick('other-archived');
    expect(fixture.componentInstance.value()).toBe('customer');
    picker.pick('');
    expect(fixture.componentInstance.value()).toBe('');
  });
});
