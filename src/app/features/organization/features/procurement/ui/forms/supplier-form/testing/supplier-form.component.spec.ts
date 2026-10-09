import type { WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { SupplierOutput } from '@features/organization/features/procurement/models';
import { SupplierForm } from '../supplier-form.component';

describe('SupplierForm', () => {
  const supplier: SupplierOutput = {
    '@id': '/suppliers/supplier',
    '@type': 'Supplier',
    id: 'supplier',
    organizationId: 'org',
    name: 'Fire supplies',
    code: 'SUP-1',
    contacts: [{ name: 'Mary', email: 'mary@example.com', role: 'Parts' }],
    revision: 3,
    createdAt: '2026-10-05T10:00:00Z',
    updatedAt: '2026-10-05T10:00:00Z',
    replayed: false,
  };
  type Draft = {
    name: string;
    code: string;
    email: string;
    phone: string;
    contacts: { name: string; email: string; phone: string; role: string }[];
  };
  const validDraft: Draft = {
    name: '  Fire supplies  ',
    code: ' SUP-1 ',
    email: '',
    phone: '  +33 1 23 45 67 89  ',
    contacts: [{ name: ' Mary ', email: 'mary@example.com', phone: '', role: ' Parts ' }],
  };

  async function setup(existing: SupplierOutput | null = null) {
    TestBed.configureTestingModule({ imports: [SupplierForm] });
    const fixture = TestBed.createComponent(SupplierForm);
    fixture.componentRef.setInput('supplier', existing);
    const emitted = vi.fn();
    fixture.componentInstance.submitted.subscribe(emitted);
    await fixture.whenStable();
    const form = fixture.componentInstance as unknown as {
      draft: WritableSignal<Draft>;
      submit: (event: Event) => void;
      addContact: () => void;
      removeContact: (index: number) => void;
    };
    return { fixture, form, emitted };
  }

  it('emits trimmed internal contacts and explicit clears without creating external accounts', async () => {
    const { fixture, form, emitted } = await setup();
    form.draft.set(validDraft);
    await fixture.whenStable();
    form.submit(new Event('submit'));
    expect(emitted).toHaveBeenCalledExactlyOnceWith({
      name: 'Fire supplies',
      code: 'SUP-1',
      email: null,
      phone: '+33 1 23 45 67 89',
      contacts: [{ name: 'Mary', email: 'mary@example.com', phone: null, role: 'Parts' }],
    });
  });

  it.each([
    { name: ' ', email: 'mary@example.com' },
    { name: 'Mary', email: 'invalid-email' },
  ])('rejects an invalid contact $name / $email before emitting', async (contact) => {
    const { fixture, form, emitted } = await setup();
    form.draft.set({ ...validDraft, contacts: [{ ...contact, phone: '', role: '' }] });
    await fixture.whenStable();
    form.submit(new Event('submit'));
    expect(emitted).not.toHaveBeenCalled();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('hlm-field-error')).not.toBeNull();
  });

  it('preserves entered contacts and displays a recoverable error across a revision refresh', async () => {
    const { fixture, form, emitted } = await setup(supplier);
    form.draft.set(validDraft);
    fixture.componentRef.setInput('error', 'Review the latest supplier revision.');
    fixture.componentRef.setInput('supplier', { ...supplier, revision: 4, name: 'Server name' });
    await fixture.whenStable();
    expect(form.draft()).toEqual(validDraft);
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      'Review the latest supplier revision.',
    );
    form.submit(new Event('submit'));
    expect(emitted).toHaveBeenCalledOnce();
    fixture.componentRef.setInput('supplier', {
      ...supplier,
      id: 'another',
      name: 'Another supplier',
    });
    await fixture.whenStable();
    expect(form.draft().name).toBe('Another supplier');
    expect(form.draft().contacts[0].name).toBe('Mary');
  });

  it('locks submissions and contact editing while the owner resolves an accepted write', async () => {
    const { fixture, form, emitted } = await setup();
    form.draft.set(validDraft);
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();
    form.submit(new Event('submit'));
    form.addContact();
    form.removeContact(0);
    expect(emitted).not.toHaveBeenCalled();
    expect(form.draft()).toEqual(validDraft);
    expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBe(true);
  });

  it('bounds the supplier contact directory to fifty entries', async () => {
    const { fixture, form, emitted } = await setup();
    const contacts = Array.from({ length: 50 }, (_, index) => ({
      name: `Contact ${index + 1}`,
      email: '',
      phone: '',
      role: '',
    }));
    form.draft.set({ ...validDraft, contacts });
    form.addContact();
    expect(form.draft().contacts).toHaveLength(50);
    form.draft.set({ ...validDraft, contacts: [...contacts, contacts[0]] });
    await fixture.whenStable();
    form.submit(new Event('submit'));
    expect(emitted).not.toHaveBeenCalled();
  });

  it('reports contact edits as dirty and submits only the remaining internal contact', async () => {
    const { fixture, form, emitted } = await setup();
    const dirty = vi.fn();
    fixture.componentInstance.dirtyChanged.subscribe(dirty);
    form.draft.set(validDraft);
    form.addContact();
    await fixture.whenStable();
    expect(form.draft().contacts).toHaveLength(2);
    const contactNameInput: HTMLInputElement =
      fixture.nativeElement.querySelector('#contact-name-1');
    contactNameInput.value = '  Jane  ';
    contactNameInput.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
    form.removeContact(0);
    await fixture.whenStable();
    expect(dirty).toHaveBeenLastCalledWith(true);
    expect(
      form.draft().contacts.map(({ name, email, phone, role }) => ({ name, email, phone, role })),
    ).toEqual([{ name: '  Jane  ', email: '', phone: '', role: '' }]);
    form.submit(new Event('submit'));
    expect(emitted).toHaveBeenCalledExactlyOnceWith({
      name: 'Fire supplies',
      code: 'SUP-1',
      email: null,
      phone: '+33 1 23 45 67 89',
      contacts: [{ name: 'Jane', email: null, phone: null, role: null }],
    });
  });
});
