import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { toStoreError } from '@core/request-state';
import type { MaintenanceCurrencyOutput } from '@features/organization/features/maintenance-costs/models';
import { MaintenanceCurrencyForm } from '../maintenance-currency-form.component';

describe('MaintenanceCurrencyForm', () => {
  let fixture: ComponentFixture<MaintenanceCurrencyForm>;
  let submissions: string[];
  const currency: MaintenanceCurrencyOutput = {
    '@id': '/maintenance-cost/currency',
    '@type': 'MaintenanceCurrency',
    organizationId: 'organization',
    currency: 'EUR',
    locked: false,
  };
  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const setValue = async (value: string): Promise<void> => {
    const control: HTMLInputElement | null = root().querySelector('#maintenance-cost-currency');
    if (!control) throw new Error('Missing currency control');
    control.value = value;
    control.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
  };
  const submit = async (): Promise<void> => {
    root()
      .querySelector('form')
      ?.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
  };

  beforeEach(async () => {
    fixture = TestBed.createComponent(MaintenanceCurrencyForm);
    submissions = [];
    fixture.componentInstance.submitted.subscribe((value: string) => submissions.push(value));
    fixture.componentRef.setInput('currency', currency);
    fixture.componentRef.setInput('canManage', true);
    await fixture.whenStable();
  });

  it('emits the exact uppercase three-letter code', async () => {
    await setValue('USD');
    await submit();
    expect(submissions).toEqual(['USD']);
  });

  it.each(['eur', 'EU', 'EURO', ' EUR '])(
    'rejects a malformed currency %s',
    async (value: string) => {
      await setValue(value);
      await submit();
      expect(submissions).toEqual([]);
      expect(root().querySelector('hlm-field-error')?.textContent).toContain(
        'three-letter uppercase',
      );
    },
  );

  it('retains the draft after a rejection and unrelated server refresh', async () => {
    await setValue('USD');
    fixture.componentRef.setInput('error', toStoreError(new Error('Save failed')));
    fixture.componentRef.setInput('currency', { ...currency });
    await fixture.whenStable();
    expect(root().querySelector<HTMLInputElement>('#maintenance-cost-currency')?.value).toBe('USD');
    expect(root().querySelector('[role="alert"]')?.textContent).toContain('Save failed');
    await submit();
    expect(submissions).toEqual(['USD']);
  });

  it('has no edit form when currency is locked, even for a manager', async () => {
    fixture.componentRef.setInput('currency', { ...currency, locked: true });
    await fixture.whenStable();
    expect(root().querySelector('form')).toBeNull();
    expect(submissions).toEqual([]);
  });

  it('has no edit form without management permission', async () => {
    fixture.componentRef.setInput('canManage', false);
    await fixture.whenStable();
    expect(root().querySelector('form')).toBeNull();
    expect(submissions).toEqual([]);
  });

  it('locks native fields and prevents resubmission while a write is pending', async () => {
    await setValue('USD');
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();
    expect(root().querySelector<HTMLInputElement>('#maintenance-cost-currency')?.disabled).toBe(
      true,
    );
    await submit();
    expect(submissions).toEqual([]);
    fixture.componentRef.setInput('pending', false);
    await fixture.whenStable();
    expect(root().querySelector<HTMLInputElement>('#maintenance-cost-currency')?.value).toBe('USD');
  });

  it('resets only after the owner acknowledges success', async () => {
    await setValue('USD');
    fixture.componentRef.setInput('currency', { ...currency, currency: 'GBP' });
    await fixture.whenStable();
    expect(root().querySelector<HTMLInputElement>('#maintenance-cost-currency')?.value).toBe('USD');
    fixture.componentRef.setInput('resetToken', 1);
    await fixture.whenStable();
    expect(root().querySelector<HTMLInputElement>('#maintenance-cost-currency')?.value).toBe('GBP');
    expect(root().querySelectorAll('hlm-field-error')).toHaveLength(0);
  });
});
