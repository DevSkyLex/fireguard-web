import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type {
  CustomerInput,
  CustomerOutput,
} from '@features/organization/features/customers/models';
import { CustomerForm } from '../customer-form.component';

describe('CustomerForm', () => {
  let fixture: ComponentFixture<CustomerForm>;
  beforeEach(async () => {
    TestBed.configureTestingModule({ imports: [CustomerForm] });
    fixture = TestBed.createComponent(CustomerForm);
    await fixture.whenStable();
  });
  const fill = async (selector: string, value: string): Promise<void> => {
    const input = fixture.nativeElement.querySelector(selector) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  };
  const submit = async (): Promise<void> => {
    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(
      new Event('submit', { cancelable: true }),
    );
    await fixture.whenStable();
  };
  it('rejects a blank customer and malformed email then emits trimmed optional clears', async () => {
    const emitted: CustomerInput[] = [];
    fixture.componentInstance.submitted.subscribe((input) => emitted.push(input));
    await submit();
    expect(emitted).toHaveLength(0);
    await fill('#customer-name', ' Hospital ');
    await fill('#customer-email', 'invalid');
    await submit();
    expect(emitted).toHaveLength(0);
    await fill('#customer-email', '');
    await submit();
    expect(emitted).toEqual([
      { name: 'Hospital', code: null, email: null, phone: null, contacts: [] },
    ]);
  });
  it('requires contact identity and preserves entered customer data after server rejection', async () => {
    const emitted: CustomerInput[] = [];
    fixture.componentInstance.submitted.subscribe((input) => emitted.push(input));
    await fill('#customer-name', 'Hospital');
    const add = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find((button) => button.textContent?.includes('Add contact'));
    if (!add) throw new Error('Missing contact creation action');
    add.click();
    await fixture.whenStable();
    await submit();
    expect(emitted).toHaveLength(0);
    await fill('#contact-name-0', ' Safety manager ');
    await fill('#contact-role-0', ' Safety ');
    await submit();
    expect(emitted[0].contacts?.[0]).toEqual({
      name: 'Safety manager',
      email: null,
      phone: null,
      role: 'Safety',
    });
    fixture.componentRef.setInput('error', 'Revision conflict');
    await fixture.whenStable();
    expect((fixture.nativeElement.querySelector('#customer-name') as HTMLInputElement).value).toBe(
      'Hospital',
    );
    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain(
      'Revision conflict',
    );
  });

  it('refreshes the displayed revision without resetting an edited draft', async () => {
    const customer = {
      '@id': 'customer',
      '@type': 'Customer',
      id: 'customer',
      organizationId: 'org',
      name: 'Original',
      contacts: [],
      revision: 1,
      createdAt: '2026-10-06T10:00:00Z',
      updatedAt: '2026-10-06T10:00:00Z',
    };
    fixture.componentRef.setInput('customer', customer);
    await fixture.whenStable();
    await fill('#customer-name', 'My draft');
    fixture.componentRef.setInput('customer', {
      ...customer,
      name: 'Concurrent change',
      revision: 2,
    });
    await fixture.whenStable();
    expect((fixture.nativeElement.querySelector('#customer-name') as HTMLInputElement).value).toBe(
      'My draft',
    );
  });

  it('shows the server-aligned length limit instead of silently refusing submission', async () => {
    const emitted: CustomerInput[] = [];
    fixture.componentInstance.submitted.subscribe((input) => emitted.push(input));
    await fill('#customer-name', 'A'.repeat(161));
    await submit();
    expect(emitted).toHaveLength(0);
    expect(fixture.nativeElement.textContent).toContain('Use at most 160 characters.');
  });

  it('normalizes optional references and contacts and emits dirty-state changes after removal', async () => {
    const emitted: CustomerInput[] = [];
    const dirtiness: boolean[] = [];
    fixture.componentInstance.submitted.subscribe((input) => emitted.push(input));
    fixture.componentInstance.dirtyChanged.subscribe((dirty) => dirtiness.push(dirty));
    const customer: CustomerOutput = {
      '@id': '/api/organizations/org/customers/customer',
      '@type': 'Customer',
      id: 'customer',
      organizationId: 'org',
      name: 'Original',
      code: 'HOSP',
      email: 'original@example.test',
      phone: '+33 1 23 45 67 89',
      contacts: [
        { name: 'Remove me', role: null, email: null, phone: null },
        {
          name: 'Safety manager',
          role: 'Safety',
          email: 'safety@example.test',
          phone: '+33 6 12 34 56 78',
        },
      ],
      revision: 1,
      createdAt: '2026-10-06T10:00:00Z',
      updatedAt: '2026-10-06T10:00:00Z',
    };
    fixture.componentRef.setInput('customer', customer);
    await fixture.whenStable();
    expect((fixture.nativeElement.querySelector('#customer-phone') as HTMLInputElement).value).toBe(
      customer.phone,
    );
    const remove = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find((button) => button.textContent?.includes('Remove contact'));
    if (!remove) throw new Error('Missing contact removal action');
    remove.click();
    await fixture.whenStable();
    await fill('#customer-name', ' Hospital ');
    await fill('#customer-code', ' HOSP-1 ');
    await fill('#customer-phone', ' +33 1 23 45 67 89 ');
    await fill('#customer-email', 'contact@example.test');
    await fill('#contact-name-0', ' Safety manager ');
    await fill('#contact-role-0', ' Safety ');
    await fill('#contact-phone-0', ' +33 6 12 34 56 78 ');
    await submit();
    expect(emitted).toEqual([
      {
        name: 'Hospital',
        code: 'HOSP-1',
        email: 'contact@example.test',
        phone: '+33 1 23 45 67 89',
        contacts: [
          {
            name: 'Safety manager',
            role: 'Safety',
            email: 'safety@example.test',
            phone: '+33 6 12 34 56 78',
          },
        ],
      },
    ]);
    expect(dirtiness).toContain(true);
  });

  it('locks all form actions during an accepted write and preserves entered values for retry', async () => {
    const emitted: CustomerInput[] = [];
    const cancelled = vi.fn();
    fixture.componentInstance.submitted.subscribe((input) => emitted.push(input));
    fixture.componentInstance.cancelled.subscribe(cancelled);
    await fill('#customer-name', 'My draft');
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();
    expect(
      (fixture.nativeElement.querySelector('#customer-name') as HTMLInputElement).disabled,
    ).toBe(true);
    const buttons = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    );
    expect(buttons.every((button) => button.disabled)).toBe(true);
    await submit();
    expect(emitted).toEqual([]);
    fixture.componentRef.setInput('pending', false);
    await fixture.whenStable();
    expect((fixture.nativeElement.querySelector('#customer-name') as HTMLInputElement).value).toBe(
      'My draft',
    );
    await submit();
    expect(emitted).toEqual([
      { name: 'My draft', code: null, email: null, phone: null, contacts: [] },
    ]);
    const cancel = buttons.find((button) => button.textContent?.trim() === 'Cancel');
    if (!cancel) throw new Error('Missing cancellation action');
    cancel.click();
    expect(cancelled).toHaveBeenCalledOnce();
  });

  it('rejects whitespace-only customer and contact names and malformed contact email', async () => {
    const emitted: CustomerInput[] = [];
    fixture.componentInstance.submitted.subscribe((input) => emitted.push(input));
    await fill('#customer-name', '   ');
    await submit();
    expect(emitted).toEqual([]);
    expect(fixture.nativeElement.textContent).toContain('Enter the customer name.');
    await fill('#customer-name', 'Hospital');
    const add = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find((button) => button.textContent?.includes('Add contact'));
    if (!add) throw new Error('Missing contact creation action');
    add.click();
    await fixture.whenStable();
    await fill('#contact-name-0', '   ');
    await submit();
    expect(emitted).toEqual([]);
    expect(fixture.nativeElement.textContent).toContain('Enter the contact name.');
    await fill('#contact-name-0', 'Safety manager');
    await fill('#contact-email-0', 'invalid');
    await submit();
    expect(emitted).toEqual([]);
    expect(fixture.nativeElement.textContent).toContain('Enter a valid email address.');
  });
});
