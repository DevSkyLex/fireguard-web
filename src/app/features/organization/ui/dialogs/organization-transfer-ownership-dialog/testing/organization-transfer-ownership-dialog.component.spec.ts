import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import type { OrganizationTransferOwnershipConfirmedEvent } from '@features/organization/models';
import { HlmCombobox } from '@shared/ui/combobox';
import { OrganizationTransferOwnershipDialog } from '../organization-transfer-ownership-dialog.component';

const candidates: ReadonlyArray<{ readonly value: string; readonly label: string }> = [
  { value: 'user-2', label: 'Jane Doe' },
  { value: 'user-3', label: 'John Roe' },
];

/**
 * Minimal ResizeObserver stand-in: the combobox popover observes its anchor,
 * and the test environment provides no implementation.
 */
class ResizeObserverStub {
  public observe(): void {}
  public unobserve(): void {}
  public disconnect(): void {}
}

const content = (): HTMLElement | null =>
  document.querySelector('[data-testid="organization-transfer-ownership-dialog"]');

describe('OrganizationTransferOwnershipDialog', () => {
  let fixture: ComponentFixture<OrganizationTransferOwnershipDialog>;
  let confirmations: OrganizationTransferOwnershipConfirmedEvent[];

  beforeAll(() => {
    globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;
  });

  const inDialog = (selector: string): HTMLElement =>
    content()?.querySelector(selector) as HTMLElement;
  const nameInput = (): HTMLInputElement =>
    inDialog('[data-testid="organization-transfer-confirm-input"]') as HTMLInputElement;
  const confirmButton = (): HTMLButtonElement =>
    inDialog('[data-testid="organization-transfer-confirm"]') as HTMLButtonElement;

  const setVisible = async (value: boolean): Promise<void> => {
    fixture.componentRef.setInput('visible', value);
    await fixture.whenStable();
  };
  const pickCandidate = async (value: string): Promise<void> => {
    const combobox = fixture.debugElement.query(By.directive(HlmCombobox));
    combobox.triggerEventHandler('valueChange', value);
    await fixture.whenStable();
  };
  const typeName = async (value: string): Promise<void> => {
    nameInput().value = value;
    nameInput().dispatchEvent(new Event('input'));
    await fixture.whenStable();
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(OrganizationTransferOwnershipDialog);
    fixture.componentRef.setInput('organizationName', 'Acme Corp');
    fixture.componentRef.setInput('candidates', candidates);
    await fixture.whenStable();

    confirmations = [];
    fixture.componentInstance.confirmed.subscribe((event) => confirmations.push(event));
  });

  it('should stay closed while not visible', () => {
    expect(content()).toBeNull();
  });

  it('should keep the confirm action disabled until a candidate is picked and the name matches', async () => {
    await setVisible(true);

    expect(confirmButton().disabled).toBe(true);

    await pickCandidate('user-2');
    expect(confirmButton().disabled).toBe(true);

    await typeName('Acme Corp');
    expect(confirmButton().disabled).toBe(false);
  });

  it('should emit the picked candidate once confirmed', async () => {
    await setVisible(true);
    await pickCandidate('user-3');
    await typeName('Acme Corp');

    confirmButton().click();

    expect(confirmations).toEqual([{ newOwnerUserId: 'user-3' }]);
  });

  it('should reject a mismatched typed name', async () => {
    await setVisible(true);
    await pickCandidate('user-2');
    await typeName('Not Acme Corp');

    confirmButton().click();

    expect(confirmations).toEqual([]);
  });

  it('should reset the picked candidate and typed name each time it opens', async () => {
    await setVisible(true);
    await pickCandidate('user-2');
    await typeName('Acme Corp');

    await setVisible(false);
    await setVisible(true);

    expect(nameInput().value).toBe('');
    expect(confirmButton().disabled).toBe(true);
  });

  it('should surface the store error', async () => {
    await setVisible(true);
    fixture.componentRef.setInput('error', 'Ownership could not be transferred.');
    await fixture.whenStable();

    expect(inDialog('[data-testid="organization-transfer-error"]')?.textContent).toContain(
      'Ownership could not be transferred.',
    );
  });
});
