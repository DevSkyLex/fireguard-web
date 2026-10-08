import { signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { toStoreError } from '@core/request-state';
import { THEME_PORT, type ThemePort } from '@core/theme';
import type { MaintenanceRateOutput } from '@features/organization/features/maintenance-costs/models';
import { MaintenanceCurrencyForm } from '@features/organization/features/maintenance-costs/ui/forms/maintenance-currency-form';
import { MaintenanceRateForm } from '@features/organization/features/maintenance-costs/ui/forms/maintenance-rate-form';
import type { MemberSelectOption } from '@features/organization/models';
import { CollectionPagination } from '@shared/collection-pagination';
import { MaintenanceCostSettings } from '../maintenance-cost-settings.component';

describe('MaintenanceCostSettings', () => {
  let fixture: ComponentFixture<MaintenanceCostSettings>;
  const rate: MaintenanceRateOutput = {
    '@id': '/maintenance-cost/rates/rate-id',
    '@type': 'MaintenanceRate',
    id: 'rate-id',
    memberId: 'hidden-member-uuid',
    hourlyAmount: '9007199254740993.123456',
    currency: 'EUR',
    effectiveFrom: '2026-10-25',
    replayed: false,
  };
  const member: MemberSelectOption = {
    value: rate.memberId,
    label: 'Alex Martin',
    displayName: 'Alex Martin',
    roleLabel: 'Technician',
    avatarUrl: null,
    initials: 'AM',
  };
  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;

  beforeEach(async () => {
    const theme: ThemePort = {
      theme: signal('light'),
      resolvedTheme: signal('light'),
      setTheme: vi.fn(),
    };
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: THEME_PORT, useValue: theme }],
    });
    fixture = TestBed.createComponent(MaintenanceCostSettings);
    fixture.componentRef.setInput('currency', {
      organizationId: 'organization',
      currency: 'EUR',
      locked: false,
    });
    fixture.componentRef.setInput('rates', [rate]);
    fixture.componentRef.setInput('rateTotal', 1);
    fixture.componentRef.setInput('members', [member]);
    await fixture.whenStable();
  });

  it('renders immutable history with exact decimals and no raw member UUID fallback', () => {
    expect(root().querySelector('tbody')?.textContent).toContain(
      '9,007,199,254,740,993.123456 EUR',
    );
    expect(root().querySelector('tbody')?.textContent).toContain('Member details unavailable');
    expect(root().textContent).not.toContain(rate.memberId);
    expect(root().querySelector('tbody button')).toBeNull();
    expect(root().querySelector('form')).toBeNull();
  });

  it('shows human names only when directory permission is granted', async () => {
    fixture.componentRef.setInput('membersAllowed', true);
    await fixture.whenStable();
    expect(root().querySelector('tbody')?.textContent).toContain('Alex Martin');
    fixture.componentRef.setInput('membersAllowed', false);
    await fixture.whenStable();
    expect(root().textContent).not.toContain('Alex Martin');
    expect(root().textContent).not.toContain(rate.memberId);
  });

  it('keeps locked currency read-only even with management permission', async () => {
    fixture.componentRef.setInput('canManage', true);
    fixture.componentRef.setInput('currency', {
      organizationId: 'organization',
      currency: 'EUR',
      locked: true,
    });
    await fixture.whenStable();
    expect(root().querySelector('[data-testid="maintenance-currency-form"]')).toBeNull();
    expect(root().textContent).toContain('Locked');
    expect(root().textContent).toContain('can no longer be changed');
  });

  it('forwards typed form payloads and original retry intent', async () => {
    fixture.componentRef.setInput('canManage', true);
    fixture.componentRef.setInput('membersAllowed', true);
    await fixture.whenStable();
    const currencySubmitted = vi.fn();
    const rateSubmitted = vi.fn();
    const retryRate = vi.fn();
    fixture.componentInstance.currencySubmitted.subscribe(currencySubmitted);
    fixture.componentInstance.rateSubmitted.subscribe(rateSubmitted);
    fixture.componentInstance.retryRate.subscribe(retryRate);
    const currencyForm: MaintenanceCurrencyForm = fixture.debugElement.query(
      By.directive(MaintenanceCurrencyForm),
    ).componentInstance;
    const rateForm: MaintenanceRateForm = fixture.debugElement.query(
      By.directive(MaintenanceRateForm),
    ).componentInstance;
    currencyForm.submitted.emit('USD');
    rateForm.submitted.emit({
      memberId: member.value,
      hourlyAmount: '12.123456',
      effectiveFrom: '2026-10-25',
    });
    rateForm.retry.emit();
    expect(currencySubmitted).toHaveBeenCalledExactlyOnceWith('USD');
    expect(rateSubmitted).toHaveBeenCalledExactlyOnceWith({
      memberId: member.value,
      hourlyAmount: '12.123456',
      effectiveFrom: '2026-10-25',
    });
    expect(retryRate).toHaveBeenCalledExactlyOnceWith(undefined);
  });

  it('keeps currency and rate load retries independent', async () => {
    const currencyReload = vi.fn();
    const rateReload = vi.fn();
    fixture.componentInstance.reloadCurrency.subscribe(currencyReload);
    fixture.componentInstance.reloadRates.subscribe(rateReload);
    fixture.componentRef.setInput('currencyError', toStoreError(new Error('Currency unavailable')));
    fixture.componentRef.setInput('ratesError', toStoreError(new Error('Rates unavailable')));
    await fixture.whenStable();
    const buttons: HTMLButtonElement[] = Array.from(root().querySelectorAll('button'));
    buttons
      .find((button: HTMLButtonElement) => button.textContent?.includes('Reload currency'))
      ?.click();
    expect(currencyReload).toHaveBeenCalledTimes(1);
    expect(rateReload).not.toHaveBeenCalled();
    buttons
      .find((button: HTMLButtonElement) => button.textContent?.includes('Reload rate history'))
      ?.click();
    expect(rateReload).toHaveBeenCalledTimes(1);
    expect(root().querySelectorAll('[role="alert"]')).toHaveLength(2);
  });

  it('pages from the server total and rejects out-of-range or in-flight page intents', async () => {
    fixture.componentRef.setInput('rateTotal', 65);
    fixture.componentRef.setInput('ratePageSize', 30);
    await fixture.whenStable();
    const changed = vi.fn();
    fixture.componentInstance.ratePageChanged.subscribe(changed);
    const pagination: CollectionPagination = fixture.debugElement.query(
      By.directive(CollectionPagination),
    ).componentInstance;
    expect(pagination.pageCount()).toBe(3);
    pagination.pageChanged.emit(2);
    expect(changed).toHaveBeenCalledExactlyOnceWith(2);
    pagination.pageChanged.emit(0);
    pagination.pageChanged.emit(4);
    fixture.componentRef.setInput('ratesPending', true);
    await fixture.whenStable();
    pagination.pageChanged.emit(3);
    expect(changed).toHaveBeenCalledTimes(1);
    expect(root().querySelector('tbody')?.textContent).toContain(
      '9,007,199,254,740,993.123456 EUR',
    );
  });

  it('distinguishes empty history from loading and read failures', async () => {
    fixture.componentRef.setInput('rates', []);
    fixture.componentRef.setInput('rateTotal', 0);
    fixture.componentRef.setInput('ratesPending', true);
    await fixture.whenStable();
    expect(root().querySelector('hlm-empty')).toBeNull();
    fixture.componentRef.setInput('ratesPending', false);
    fixture.componentRef.setInput('ratesError', toStoreError(new Error('Unavailable')));
    await fixture.whenStable();
    expect(root().querySelector('hlm-empty')).toBeNull();
    fixture.componentRef.setInput('ratesError', null);
    await fixture.whenStable();
    expect(root().querySelector('hlm-empty')?.textContent).toContain('No hourly rates yet');
  });
});
