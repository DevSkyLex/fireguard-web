import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { OrganizationLeaveDialog } from '../organization-leave-dialog.component';

const content = (): HTMLElement | null =>
  document.querySelector('[data-testid="organization-leave-dialog"]');

describe('OrganizationLeaveDialog', () => {
  let fixture: ComponentFixture<OrganizationLeaveDialog>;
  let confirmations: number;
  let visibilityChanges: boolean[];

  const confirmButton = (): HTMLButtonElement =>
    content()?.querySelector('[data-testid="organization-leave-confirm"]') as HTMLButtonElement;

  const setVisible = async (value: boolean): Promise<void> => {
    fixture.componentRef.setInput('visible', value);
    await fixture.whenStable();
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(OrganizationLeaveDialog);
    fixture.componentRef.setInput('organizationName', 'Acme Corp');
    await fixture.whenStable();

    confirmations = 0;
    visibilityChanges = [];
    fixture.componentInstance.confirmed.subscribe(() => confirmations++);
    fixture.componentInstance.visibleChange.subscribe((value) => visibilityChanges.push(value));
  });

  it('should stay closed while not visible', () => {
    expect(content()).toBeNull();
  });

  it('should name the organization in the message', async () => {
    await setVisible(true);

    expect(content()?.textContent).toContain('Acme Corp');
  });

  it('should emit confirmed on the primary action', async () => {
    await setVisible(true);

    confirmButton().click();

    expect(confirmations).toBe(1);
  });

  it('should lock the confirm action while pending', async () => {
    await setVisible(true);
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();

    expect(confirmButton().disabled).toBe(true);
    expect(confirmButton().textContent).toContain('Leaving…');
  });

  it('should surface the backend last-administrator refusal inline', async () => {
    await setVisible(true);
    fixture.componentRef.setInput('error', 'You are the last active administrator.');
    await fixture.whenStable();

    expect(
      content()?.querySelector('[data-testid="organization-leave-error"]')?.textContent,
    ).toContain('You are the last active administrator.');
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
