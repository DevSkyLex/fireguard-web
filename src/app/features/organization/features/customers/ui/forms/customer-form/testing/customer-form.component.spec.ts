import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { CustomerInput } from '@features/organization/features/customers/models';
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
});
