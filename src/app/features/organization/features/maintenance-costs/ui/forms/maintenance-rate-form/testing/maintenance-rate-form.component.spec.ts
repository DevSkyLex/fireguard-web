import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { BrnSelect } from '@spartan-ng/brain/select';
import { toStoreError } from '@core/request-state';
import type { CreateMaintenanceRateInput } from '@features/organization/features/maintenance-costs/models';
import type { MemberSelectOption } from '@features/organization/models';
import { HlmSelect } from '@shared/ui/select';
import { MaintenanceRateForm } from '../maintenance-rate-form.component';

describe('MaintenanceRateForm', () => {
  let fixture: ComponentFixture<MaintenanceRateForm>;
  let submissions: Omit<CreateMaintenanceRateInput, 'clientId'>[];
  const member: MemberSelectOption = {
    value: 'member-id',
    label: 'Alex Martin',
    displayName: 'Alex Martin',
    roleLabel: 'Technician',
    avatarUrl: null,
    initials: 'AM',
  };
  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const setValue = async (id: string, value: string): Promise<void> => {
    const control: HTMLInputElement | null = root().querySelector('#' + id);
    if (!control) throw new Error('Missing input ' + id);
    control.value = value;
    control.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
  };
  const chooseMember = async (value: string): Promise<void> => {
    const select: BrnSelect<string> = fixture.debugElement
      .query(By.directive(HlmSelect))
      .injector.get(BrnSelect);
    select.select(value);
    await fixture.whenStable();
  };
  const submit = async (): Promise<void> => {
    root()
      .querySelector('form')
      ?.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
  };
  const validDraft = async (amount = '42.123456', date = '2026-10-25'): Promise<void> => {
    await chooseMember(member.value);
    await setValue('maintenance-rate-amount', amount);
    await setValue('maintenance-rate-effective-from', date);
  };

  beforeEach(async () => {
    fixture = TestBed.createComponent(MaintenanceRateForm);
    submissions = [];
    fixture.componentInstance.submitted.subscribe(
      (value: Omit<CreateMaintenanceRateInput, 'clientId'>) => submissions.push(value),
    );
    fixture.componentRef.setInput('members', [member]);
    fixture.componentRef.setInput('membersAllowed', true);
    fixture.componentRef.setInput('canManage', true);
    fixture.componentRef.setInput('currency', 'EUR');
    await fixture.whenStable();
  });

  it('chooses a named member and emits exact strings without an operation identity', async () => {
    await validDraft('9007199254740993.123456');
    await submit();
    expect(submissions).toEqual([
      {
        memberId: member.value,
        hourlyAmount: '9007199254740993.123456',
        effectiveFrom: '2026-10-25',
      },
    ]);
    expect(root().querySelector('#maintenance-rate-member')?.textContent).toContain('Alex Martin');
    expect(root().querySelector('input[id*="member"]')).toBeNull();
  });

  it('accepts explicit zero and a leap-year date', async () => {
    await validDraft('0', '2028-02-29');
    await submit();
    expect(submissions).toEqual([
      { memberId: member.value, hourlyAmount: '0', effectiveFrom: '2028-02-29' },
    ]);
  });

  it.each(['-1', '1e2', '1.1234567', '1,25', '', '.5', '01', '1000000000000000000'])(
    'rejects invalid exact amount %s',
    async (amount: string) => {
      await validDraft(amount);
      await submit();
      expect(submissions).toEqual([]);
      expect(root().querySelector('hlm-field-error')?.textContent).toContain('nonnegative amount');
    },
  );

  it('rejects an impossible calendar date', async () => {
    await validDraft('12', '2026-02-29');
    await submit();
    expect(submissions).toEqual([]);
    expect(root().querySelector('hlm-field-error')?.textContent).toContain('effective date');
  });

  it('rejects a selection outside the authorized member options', async () => {
    await chooseMember('unavailable-id');
    await setValue('maintenance-rate-amount', '12');
    await setValue('maintenance-rate-effective-from', '2026-10-25');
    await submit();
    expect(submissions).toEqual([]);
  });

  it('does not expose a picker or permit submit without directory permission', async () => {
    await validDraft();
    fixture.componentRef.setInput('membersAllowed', false);
    await fixture.whenStable();
    expect(root().querySelector('hlm-select')).toBeNull();
    expect(root().textContent).not.toContain('Alex Martin');
    await submit();
    expect(submissions).toEqual([]);
  });

  it('has no form or commands without management permission', async () => {
    fixture.componentRef.setInput('canManage', false);
    await fixture.whenStable();
    expect(root().querySelector('form')).toBeNull();
    expect(root().querySelector('button')).toBeNull();
  });

  it.each(['pending', 'membersLoading'])('freezes the draft while %s', async (state: string) => {
    await validDraft();
    fixture.componentRef.setInput(state, true);
    await fixture.whenStable();
    expect(root().querySelector<HTMLInputElement>('#maintenance-rate-amount')?.disabled).toBe(true);
    expect(
      root().querySelector<HTMLInputElement>('#maintenance-rate-effective-from')?.disabled,
    ).toBe(true);
    expect(root().querySelector<HTMLButtonElement>('#maintenance-rate-member')?.disabled).toBe(
      true,
    );
    await submit();
    expect(submissions).toEqual([]);
  });

  it('preserves rejected values and resets them only on confirmed success', async () => {
    await validDraft();
    fixture.componentRef.setInput('error', toStoreError(new Error('Rate rejected')));
    await fixture.whenStable();
    expect(root().querySelector<HTMLInputElement>('#maintenance-rate-amount')?.value).toBe(
      '42.123456',
    );
    expect(root().querySelector<HTMLInputElement>('#maintenance-rate-effective-from')?.value).toBe(
      '2026-10-25',
    );
    await submit();
    expect(submissions).toHaveLength(1);
    fixture.componentRef.setInput('resetToken', 1);
    await fixture.whenStable();
    expect(root().querySelector<HTMLInputElement>('#maintenance-rate-amount')?.value).toBe('');
    expect(root().querySelector<HTMLInputElement>('#maintenance-rate-effective-from')?.value).toBe(
      '',
    );
  });

  it('freezes uncertain fields and emits only retry intent for the original declaration', async () => {
    await validDraft();
    fixture.componentRef.setInput('uncertain', true);
    await fixture.whenStable();
    const retry = vi.fn();
    fixture.componentInstance.retry.subscribe(retry);
    expect(root().querySelector<HTMLInputElement>('#maintenance-rate-amount')?.disabled).toBe(true);
    await submit();
    expect(submissions).toEqual([]);
    root().querySelector<HTMLButtonElement>('[data-testid="maintenance-rate-retry"]')?.click();
    expect(retry).toHaveBeenCalledExactlyOnceWith(undefined);
    expect(root().querySelector<HTMLInputElement>('#maintenance-rate-amount')?.value).toBe(
      '42.123456',
    );
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();
    expect(
      root().querySelector<HTMLButtonElement>('[data-testid="maintenance-rate-retry"]')?.disabled,
    ).toBe(true);
  });

  it('requires the confirmed organization currency before new rate creation', async () => {
    await validDraft();
    fixture.componentRef.setInput('currency', null);
    await fixture.whenStable();
    await submit();
    expect(submissions).toEqual([]);
    expect(
      root().querySelector('[data-testid="maintenance-rate-submit"]')?.getAttribute('disabled'),
    ).not.toBeNull();
  });
});
