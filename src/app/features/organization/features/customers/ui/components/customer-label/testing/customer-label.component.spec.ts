import { PLATFORM_ID, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import {
  idleCallState,
  pendingCallState,
  successCallState,
  errorCallState,
  toStoreError,
  type CallState,
} from '@core/request-state';
import type { CustomerOutput } from '@features/organization/features/customers/models';
import { CustomerStore } from '@features/organization/features/customers/state';
import { CustomerLabel } from '../customer-label.component';

describe('CustomerLabel', () => {
  const customer: CustomerOutput = {
    '@id': '/api/organizations/org/customers/customer',
    '@type': 'Customer',
    id: 'customer',
    organizationId: 'org',
    name: 'Hospital',
    contacts: [],
    revision: 1,
    createdAt: '2026-10-06T10:00:00Z',
    updatedAt: '2026-10-06T10:00:00Z',
  };
  let fixture: ComponentFixture<CustomerLabel>;
  let store: {
    read: ReturnType<typeof vi.fn>;
    readCallState: ReturnType<typeof signal<CallState<CustomerOutput>>>;
  };

  beforeEach(() => {
    store = { read: vi.fn(), readCallState: signal<CallState<CustomerOutput>>(idleCallState()) };
    TestBed.configureTestingModule({ imports: [CustomerLabel] }).overrideComponent(CustomerLabel, {
      set: { providers: [{ provide: CustomerStore, useValue: store }] },
    });
  });
  const render = async (customerId: string | null): Promise<void> => {
    fixture = TestBed.createComponent(CustomerLabel);
    fixture.componentRef.setInput('organizationId', 'org');
    fixture.componentRef.setInput('customerId', customerId);
    await fixture.whenStable();
  };

  it('renders optional unassigned ownership and clears a previous retained-label read', async () => {
    await render(null);
    expect(store.read).toHaveBeenCalledExactlyOnceWith(null);
    expect(fixture.nativeElement.textContent.trim()).toBe('No customer');
    fixture.componentRef.setInput('customerId', 'customer');
    await fixture.whenStable();
    expect(store.read).toHaveBeenLastCalledWith({ organizationId: 'org', customerId: 'customer' });
    fixture.componentRef.setInput('customerId', null);
    await fixture.whenStable();
    expect(store.read).toHaveBeenLastCalledWith(null);
    expect(fixture.nativeElement.textContent.trim()).toBe('No customer');
  });

  it('loads the retained identity independently and keeps historical archived ownership readable', async () => {
    await render('customer');
    expect(store.read).toHaveBeenCalledExactlyOnceWith({
      organizationId: 'org',
      customerId: 'customer',
    });
    store.readCallState.set(pendingCallState());
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[aria-label="Loading customer"]')).not.toBeNull();
    store.readCallState.set(successCallState(customer));
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent.trim()).toBe('Hospital');
    store.readCallState.set(successCallState({ ...customer, archivedAt: '2026-10-06T11:00:00Z' }));
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Hospital');
    expect(fixture.nativeElement.textContent).toContain('(archived)');
  });

  it('retries a failed label using the current organization and retained customer identity', async () => {
    await render('customer');
    fixture.componentRef.setInput('organizationId', 'other');
    await fixture.whenStable();
    store.readCallState.set(errorCallState(toStoreError(new Error('Customer unavailable'))));
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toBe(
      'Customer unavailable',
    );
    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();
    expect(store.read).toHaveBeenLastCalledWith({
      organizationId: 'other',
      customerId: 'customer',
    });
  });

  it('does not issue secondary authenticated retained-label reads during SSR', async () => {
    TestBed.overrideProvider(PLATFORM_ID, { useValue: 'server' });
    await render('customer');
    fixture.componentRef.setInput('organizationId', 'other');
    await fixture.whenStable();
    expect(store.read).not.toHaveBeenCalled();
  });
});
