import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { AccountDeactivateDialog } from '../account-deactivate-dialog.component';

const content = (): HTMLElement | null =>
  document.querySelector('[data-testid="account-deactivate-dialog"]');

describe('AccountDeactivateDialog', () => {
  let fixture: ComponentFixture<AccountDeactivateDialog>;
  let confirmations: number;
  let visibilityChanges: boolean[];

  const confirmButton = (): HTMLButtonElement =>
    content()?.querySelector('[data-testid="account-deactivate-confirm"]') as HTMLButtonElement;

  const setVisible = async (value: boolean): Promise<void> => {
    fixture.componentRef.setInput('visible', value);
    await fixture.whenStable();
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(AccountDeactivateDialog);
    await fixture.whenStable();

    confirmations = 0;
    visibilityChanges = [];
    fixture.componentInstance.confirmed.subscribe(() => confirmations++);
    fixture.componentInstance.visibleChange.subscribe((value) => visibilityChanges.push(value));
  });

  it('should stay closed while not visible', () => {
    expect(content()).toBeNull();
  });

  it('should state the real consequence: admin-only reactivation', async () => {
    await setVisible(true);

    // The backend rejects a deactivated login outright, so the copy must never promise it reactivates.
    expect(content()?.textContent).toContain('only an administrator can reactivate');
    expect(content()?.textContent).toContain('signing in again will not');
  });

  it('should emit confirmed on the primary action', async () => {
    await setVisible(true);

    confirmButton().click();

    expect(confirmations).toBe(1);
  });

  it('should guard the confirm action with aria-disabled while pending', async () => {
    await setVisible(true);
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();

    expect(confirmButton().getAttribute('aria-disabled')).toBe('true');
    expect(confirmButton().getAttribute('aria-busy')).toBe('true');
    expect(confirmButton().textContent).toContain('Deactivating…');

    confirmButton().click();

    expect(confirmations).toBe(0);
  });

  it('should surface the backend refusal inline', async () => {
    await setVisible(true);
    fixture.componentRef.setInput('error', 'Insufficient permissions.');
    await fixture.whenStable();

    expect(
      content()?.querySelector('[data-testid="account-deactivate-error"]')?.textContent,
    ).toContain('Insufficient permissions.');
  });

  it('should report a dismissal via Cancel without emitting confirmed', async () => {
    await setVisible(true);

    const cancelButton: HTMLButtonElement | undefined = Array.from(
      content()?.querySelectorAll('button') ?? [],
    ).find((button: HTMLButtonElement): boolean => button.textContent?.includes('Cancel') ?? false);
    cancelButton?.click();
    await fixture.whenStable();

    expect(visibilityChanges).toEqual([false]);
    expect(confirmations).toBe(0);
  });
});
