import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { BrnSelect } from '@spartan-ng/brain/select';
import { toStoreError } from '@core/request-state';
import type {
  CreateMaintenanceExpenseInput,
  MaintenanceCostItem,
} from '@features/organization/features/maintenance-costs/models';
import { HlmSelect } from '@shared/ui/select';
import { MaintenanceExpenseForm } from '../maintenance-expense-form.component';

describe('MaintenanceExpenseForm', () => {
  let fixture: ComponentFixture<MaintenanceExpenseForm>;
  let submissions: Omit<CreateMaintenanceExpenseInput, 'clientId'>[];
  const original: MaintenanceCostItem = {
    id: 'expense:original',
    sourceId: 'original',
    kind: 'expense',
    description: 'Original repair',
    currency: 'EUR',
    amount: '50.000000',
    occurredAt: '2025-01-01T00:00:00Z',
    workItemId: 'task',
  };
  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const setValue = async (id: string, value: string): Promise<void> => {
    const control = root().querySelector<HTMLInputElement | HTMLTextAreaElement>('#' + id);
    if (!control) throw new Error('Missing input ' + id);
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
  const chooseOffset = async (value: string): Promise<void> => {
    const select: BrnSelect<string> = fixture.debugElement
      .query(By.directive(HlmSelect))
      .injector.get(BrnSelect);
    select.select(value);
    await fixture.whenStable();
  };
  const draft = async (
    amount = '9007199254740993.123456',
    date = '2025-01-15T14:30:05',
  ): Promise<void> => {
    await setValue('maintenance-expense-amount', amount);
    await setValue('maintenance-expense-description', '  Repair fee  ');
    await setValue('maintenance-expense-date', date);
  };
  beforeAll(() => {
    globalThis.ResizeObserver ??= class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    } as unknown as typeof ResizeObserver;
  });
  beforeEach(async () => {
    fixture = TestBed.createComponent(MaintenanceExpenseForm);
    submissions = [];
    fixture.componentRef.setInput('scope', 'org/intervention');
    fixture.componentRef.setInput('timezone', 'Europe/Paris');
    fixture.componentInstance.submitted.subscribe((value) => submissions.push(value));
    await fixture.whenStable();
  });
  it('emits an exact amount and organization-local actual time as UTC, without a new replay id', async () => {
    await draft();
    await submit();
    expect(root().querySelector('hlm-field-error')?.textContent).toBeUndefined();
    expect(submissions).toEqual([
      {
        amount: '9007199254740993.123456',
        description: 'Repair fee',
        incurredAt: '2025-01-15T13:30:05Z',
        adjustmentOf: null,
        workItemId: null,
      },
    ]);
  });
  it('requires an original expense for negative amounts and links a correction to its original task', async () => {
    await draft('-0.000001');
    await submit();
    expect(submissions).toEqual([]);
    fixture.componentRef.setInput('originalExpense', original);
    await fixture.whenStable();
    await draft('-0.000001');
    await submit();
    expect(submissions[0]).toMatchObject({
      amount: '-0.000001',
      adjustmentOf: 'original',
      workItemId: 'task',
    });
  });
  it.each(['1.1234567', '1e2', '1,25'])(
    'rejects invalid exact amount %s',
    async (value: string) => {
      await draft(value);
      await submit();
      expect(submissions).toEqual([]);
    },
  );
  it.each(['2099-01-01T00:00:00', '2025-03-30T02:30:00'])(
    'rejects future or nonexistent local actual time %s',
    async (value: string) => {
      await draft('12', value);
      await submit();
      expect(submissions).toEqual([]);
      expect(root().textContent).toContain('valid actual date');
      expect(root().querySelector('hlm-select')).toBeNull();
      expect(root().querySelector<HTMLInputElement>('#maintenance-expense-date')?.value).toBe(
        value.slice(0, 16),
      );
    },
  );
  it('requires an explicit UTC offset for a repeated organization-local hour', async () => {
    await draft('12', '2025-10-26T02:30:00');
    await submit();
    expect(submissions).toEqual([]);
    expect(root().textContent).toContain('Choose the UTC offset of the actual expense.');
    expect(root().querySelector<HTMLInputElement>('#maintenance-expense-date')?.value).toBe(
      '2025-10-26T02:30',
    );
  });
  it.each([
    { offset: '+02:00', incurredAt: '2025-10-26T00:30:00Z' },
    { offset: '+01:00', incurredAt: '2025-10-26T01:30:00Z' },
  ])('emits the explicitly selected $offset expense instant', async ({ offset, incurredAt }) => {
    await draft('12', '2025-10-26T02:30:00');
    await chooseOffset(offset);
    await submit();
    expect(submissions).toEqual([
      { amount: '12', description: 'Repair fee', incurredAt, adjustmentOf: null, workItemId: null },
    ]);
  });
  it('requires a new offset decision after the repeated local timestamp changes', async () => {
    await draft('12', '2025-10-26T02:30:00');
    await chooseOffset('+02:00');
    await setValue('maintenance-expense-date', '2025-10-26T02:45:05');
    await submit();
    expect(submissions).toEqual([]);
    expect(root().querySelector('#maintenance-expense-offset')?.textContent).toContain(
      'Choose the actual UTC offset',
    );
    await chooseOffset('+01:00');
    await submit();
    expect(submissions[0]?.incurredAt).toBe('2025-10-26T01:45:05Z');
  });
  it('requires a new offset decision after the organization timezone changes', async () => {
    await draft('12', '2025-10-26T02:30:00');
    await chooseOffset('+02:00');
    fixture.componentRef.setInput('timezone', 'Europe/Berlin');
    await fixture.whenStable();
    await submit();
    expect(submissions).toEqual([]);
    expect(root().querySelector('#maintenance-expense-offset')?.textContent).toContain(
      'Choose the actual UTC offset',
    );
  });
  it('preserves failed drafts, but resets private fields on a scope replacement or confirmed success', async () => {
    await draft('42.123456');
    fixture.componentRef.setInput('error', toStoreError(new Error('Rejected')));
    await fixture.whenStable();
    expect(root().querySelector<HTMLInputElement>('#maintenance-expense-amount')?.value).toBe(
      '42.123456',
    );
    fixture.componentRef.setInput('resetToken', 1);
    await fixture.whenStable();
    expect(root().querySelector<HTMLInputElement>('#maintenance-expense-amount')?.value).toBe('');
    await draft('12');
    fixture.componentRef.setInput('scope', 'other/intervention');
    await fixture.whenStable();
    expect(root().querySelector<HTMLInputElement>('#maintenance-expense-amount')?.value).toBe('');
  });
  it.each(['locked', 'pending'])(
    'freezes fields and disallows a new declaration while %s',
    async (state: string) => {
      await draft('0');
      fixture.componentRef.setInput(state, true);
      await fixture.whenStable();
      await submit();
      expect(submissions).toEqual([]);
      expect(root().querySelector<HTMLInputElement>('#maintenance-expense-amount')?.disabled).toBe(
        true,
      );
    },
  );
});
