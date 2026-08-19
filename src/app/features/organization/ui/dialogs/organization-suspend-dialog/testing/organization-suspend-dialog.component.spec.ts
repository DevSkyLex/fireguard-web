import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { OrganizationSuspendDialog } from '../organization-suspend-dialog.component';

const content = (): HTMLElement | null =>
  document.querySelector('[data-testid="organization-suspend-dialog"]');

describe('OrganizationSuspendDialog', () => {
  let fixture: ComponentFixture<OrganizationSuspendDialog>;
  let confirmations: number;
  let visibilityChanges: boolean[];

  const confirmButton = (): HTMLButtonElement =>
    content()?.querySelector('[data-testid="organization-suspend-confirm"]') as HTMLButtonElement;

  const setVisible = async (value: boolean): Promise<void> => {
    fixture.componentRef.setInput('visible', value);
    await fixture.whenStable();
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(OrganizationSuspendDialog);
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

  it('should name the organization in the consequence message', async () => {
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
    expect(confirmButton().textContent).toContain('Suspending…');
  });

  it('should surface the store error', async () => {
    await setVisible(true);
    fixture.componentRef.setInput('error', 'Missing permission.');
    await fixture.whenStable();

    expect(
      content()?.querySelector('[data-testid="organization-suspend-error"]')?.textContent,
    ).toContain('Missing permission.');
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
