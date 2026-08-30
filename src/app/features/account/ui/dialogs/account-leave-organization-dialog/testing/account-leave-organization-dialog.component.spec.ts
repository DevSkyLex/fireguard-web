import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { AccountLeaveOrganizationDialog } from '../account-leave-organization-dialog.component';

const content = (): HTMLElement | null =>
  document.querySelector('[data-testid="account-leave-organization-dialog"]');
const confirmButton = (): HTMLButtonElement =>
  content()?.querySelector(
    '[data-testid="account-leave-organization-confirm"]',
  ) as HTMLButtonElement;
const cancelButton = (): HTMLButtonElement =>
  content()?.querySelector('[hlmAlertDialogCancel]') as HTMLButtonElement;

describe('AccountLeaveOrganizationDialog', () => {
  let fixture: ComponentFixture<AccountLeaveOrganizationDialog>;
  let visibleChanges: boolean[];
  let confirmed: number;

  const setInputs = async (
    visible: boolean,
    organizationName: string = 'Acme Corp',
    pending: boolean = false,
    error: string | null = null,
  ): Promise<void> => {
    fixture.componentRef.setInput('visible', visible);
    fixture.componentRef.setInput('organizationName', organizationName);
    fixture.componentRef.setInput('pending', pending);
    fixture.componentRef.setInput('error', error);
    await fixture.whenStable();
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(AccountLeaveOrganizationDialog);
    fixture.componentRef.setInput('organizationName', 'Acme Corp');
    await fixture.whenStable();

    visibleChanges = [];
    confirmed = 0;
    fixture.componentInstance.visibleChange.subscribe((value: boolean) =>
      visibleChanges.push(value),
    );
    fixture.componentInstance.confirmed.subscribe(() => confirmed++);
  });

  it('should stay closed and issue no request while nothing is being left', () => {
    expect(content()).toBeNull();
  });

  it('should name the organization being left', async () => {
    await setInputs(true, 'Acme Corp');

    expect(content()?.textContent).toContain('Acme Corp');
  });

  it('should emit confirmed on the confirm action', async () => {
    await setInputs(true);

    confirmButton().click();

    expect(confirmed).toBe(1);
  });

  it('should not emit confirmed while a leave write is in flight, and disable the confirm button', async () => {
    await setInputs(true, 'Acme Corp', true);

    expect(confirmButton().disabled).toBe(true);

    confirmButton().click();

    expect(confirmed).toBe(0);
  });

  it('should emit visibleChange(false) on Cancel without emitting confirmed', async () => {
    await setInputs(true);

    cancelButton().click();
    await fixture.whenStable();

    expect(visibleChanges).toContain(false);
    expect(confirmed).toBe(0);
  });

  it('should surface the last leave error inline', async () => {
    await setInputs(true, 'Acme Corp', false, 'You are the last administrator.');

    expect(
      content()?.querySelector('[data-testid="account-leave-organization-error"]')?.textContent,
    ).toContain('You are the last administrator.');
  });
});
