import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { BrnSelect } from '@spartan-ng/brain/select';
import { toStoreError } from '@core/request-state';
import { maintenanceCostFixture } from '@features/organization/features/maintenance-costs/models/maintenance-cost/testing/maintenance-cost.fixture';
import { HlmSelect } from '@shared/ui/select';
import {
  MaintenancePlanningForm,
  type MaintenancePlanningIntent,
} from '../maintenance-planning-form.component';

describe('MaintenancePlanningForm', () => {
  let fixture: ComponentFixture<MaintenancePlanningForm>;
  let submissions: MaintenancePlanningIntent[];
  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const setValue = async (id: string, value: string): Promise<void> => {
    const control = root().querySelector<HTMLInputElement>('#' + id);
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
  const kind = async (value: 'time' | 'material' | 'external'): Promise<void> => {
    fixture.debugElement
      .query(By.directive(HlmSelect))
      .injector.get<BrnSelect<string>>(BrnSelect)
      .select(value);
    await fixture.whenStable();
  };
  beforeEach(async () => {
    fixture = TestBed.createComponent(MaintenancePlanningForm);
    submissions = [];
    fixture.componentRef.setInput('cost', maintenanceCostFixture());
    fixture.componentInstance.submitted.subscribe((value) => submissions.push(value));
    await fixture.whenStable();
  });
  it('emits independent revision zero and distinguishes blank forecast from exact zero', async () => {
    await setValue('maintenance-budget', '0');
    await submit();
    expect(submissions).toEqual([
      { revision: 0, input: { plannedBudget: '0', estimatedMinutes: null, resources: [] } },
    ]);
    await setValue('maintenance-budget', '');
    await submit();
    expect(submissions[1]?.input.plannedBudget).toBeNull();
  });
  it('retains exact large budgets and refuses excess precision', async () => {
    await setValue('maintenance-budget', '9007199254740993.123456');
    await submit();
    expect(submissions[0]?.input.plannedBudget).toBe('9007199254740993.123456');
    await setValue('maintenance-budget', '1.1234567');
    await submit();
    expect(submissions).toHaveLength(1);
    expect(root().querySelector('hlm-field-error')?.textContent).toContain('six decimal');
  });
  it('clears inactive resource tuples when changing materials to work time and external service', async () => {
    fixture.componentRef.setInput(
      'cost',
      maintenanceCostFixture({
        resources: [
          {
            kind: 'material',
            description: 'Spare part',
            quantity: '2',
            unitCost: '50.000000',
            estimatedMinutes: null,
            amount: '100.000000',
            workItemId: 'task',
          },
        ],
      }),
    );
    fixture.componentRef.setInput('resetToken', 1);
    await fixture.whenStable();
    await kind('time');
    await setValue('maintenance-resource-minutes-0', '60');
    await submit();
    expect(submissions[0]?.input.resources).toEqual([
      {
        kind: 'time',
        description: 'Spare part',
        quantity: null,
        unitCost: '50.000000',
        estimatedMinutes: 60,
        amount: null,
        workItemId: 'task',
      },
    ]);
    await kind('external');
    await setValue('maintenance-resource-amount-0', '7.123456');
    await submit();
    expect(submissions[1]?.input.resources).toEqual([
      {
        kind: 'external',
        description: 'Spare part',
        quantity: null,
        unitCost: null,
        estimatedMinutes: null,
        amount: '7.123456',
        workItemId: 'task',
      },
    ]);
    expect(root().querySelector('#maintenance-resource-quantity-0')).toBeNull();
    expect(root().querySelector('#maintenance-resource-unit-0')).toBeNull();
  });
  it('does not let an invalid hidden previous quantity prevent an external estimate', async () => {
    fixture.componentRef.setInput(
      'cost',
      maintenanceCostFixture({
        resources: [
          {
            kind: 'material',
            description: 'Estimate',
            quantity: '1',
            unitCost: '50',
            amount: null,
          },
        ],
      }),
    );
    fixture.componentRef.setInput('resetToken', 1);
    await fixture.whenStable();
    await setValue('maintenance-resource-quantity-0', 'invalid');
    await kind('external');
    await setValue('maintenance-resource-amount-0', '0');
    await submit();
    expect(submissions[0]?.input.resources?.[0]).toMatchObject({
      quantity: null,
      unitCost: null,
      estimatedMinutes: null,
      amount: '0',
    });
  });
  it('retains rejected edits and requires explicit adoption of the newly read revision', async () => {
    await setValue('maintenance-budget', '99.000001');
    fixture.componentRef.setInput('error', toStoreError({ status: 412, title: 'Stale' }));
    fixture.componentRef.setInput(
      'cost',
      maintenanceCostFixture({ planningRevision: 2, plannedBudget: '40.000000' }),
    );
    await fixture.whenStable();
    expect(root().querySelector<HTMLInputElement>('#maintenance-budget')?.value).toBe('99.000001');
    await submit();
    expect(submissions).toEqual([]);
    [...root().querySelectorAll<HTMLButtonElement>('button')]
      .find((button) => button.textContent?.includes('Use the latest'))
      ?.click();
    await fixture.whenStable();
    await submit();
    expect(submissions[0]).toMatchObject({ revision: 2, input: { plannedBudget: '99.000001' } });
    fixture.componentRef.setInput('resetToken', 1);
    await fixture.whenStable();
    expect(root().querySelector<HTMLInputElement>('#maintenance-budget')?.value).toBe('40.000000');
  });
  it.each(['pending', 'locked'])('prevents writes while %s', async (state: string) => {
    fixture.componentRef.setInput(state, true);
    await fixture.whenStable();
    await submit();
    expect(submissions).toEqual([]);
    expect(root().querySelector<HTMLInputElement>('#maintenance-budget')?.disabled).toBe(true);
  });
  it('obeys the server closure capability independently of management permission', async () => {
    fixture.componentRef.setInput('cost', maintenanceCostFixture({ planningEditable: false }));
    await fixture.whenStable();
    await submit();
    expect(submissions).toEqual([]);
  });
});
