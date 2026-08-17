import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { InterventionBulkDeleteDialog } from '../intervention-bulk-delete-dialog.component';

const content = (): HTMLElement | null =>
  document.querySelector('[data-testid="interventions-delete-dialog"]');
const confirmButton = (): HTMLButtonElement =>
  content()?.querySelector('[data-testid="interventions-delete-confirm"]') as HTMLButtonElement;
const cancelButton = (): HTMLButtonElement =>
  content()?.querySelector('button:not([data-testid])') as HTMLButtonElement;

describe('InterventionBulkDeleteDialog', () => {
  let fixture: ComponentFixture<InterventionBulkDeleteDialog>;
  let confirmed: number;
  let dismissed: number;

  const setVisible = async (visible: boolean): Promise<void> => {
    fixture.componentRef.setInput('visible', visible);
    await fixture.whenStable();
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(InterventionBulkDeleteDialog);
    fixture.componentRef.setInput('title', 'Delete 3 interventions?');
    fixture.componentRef.setInput('description', 'This will permanently delete 3 interventions.');
    await fixture.whenStable();

    confirmed = 0;
    dismissed = 0;
    fixture.componentInstance.confirmed.subscribe(() => confirmed++);
    fixture.componentInstance.dismissed.subscribe(() => dismissed++);
  });

  it('should stay closed until visible is set', () => {
    expect(content()).toBeNull();
  });

  it('should render the given title and description', async () => {
    await setVisible(true);

    expect(content()?.textContent).toContain('Delete 3 interventions?');
    expect(content()?.textContent).toContain('permanently delete 3 interventions');
  });

  it('should render the error message when set', async () => {
    fixture.componentRef.setInput('errorMessage', 'A facility was locked.');
    await setVisible(true);

    expect(
      content()?.querySelector('[data-testid="interventions-delete-error"]')?.textContent,
    ).toContain('A facility was locked.');
  });

  it('should emit confirmed on Delete', async () => {
    await setVisible(true);

    confirmButton().click();

    expect(confirmed).toBe(1);
  });

  it('should disable both actions while busy', async () => {
    fixture.componentRef.setInput('busy', true);
    await setVisible(true);

    expect(confirmButton().getAttribute('aria-disabled')).toBe('true');
    expect(cancelButton().getAttribute('aria-disabled')).toBe('true');
  });

  it('should emit dismissed on Cancel without emitting confirmed', async () => {
    await setVisible(true);

    cancelButton().click();

    expect(dismissed).toBe(1);
    expect(confirmed).toBe(0);
  });
});
