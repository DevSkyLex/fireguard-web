import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { InterventionSyncDiscardDialog } from '../intervention-sync-discard-dialog.component';

const content = (): HTMLElement | null =>
  document.querySelector('[data-testid="intervention-sync-discard-dialog"]');
const confirmButton = (): HTMLButtonElement =>
  content()?.querySelector(
    '[data-testid="intervention-sync-discard-confirm"]',
  ) as HTMLButtonElement;
const cancelButton = (): HTMLButtonElement =>
  content()?.querySelector('[hlmAlertDialogCancel]') as HTMLButtonElement;

describe('InterventionSyncDiscardDialog', () => {
  let fixture: ComponentFixture<InterventionSyncDiscardDialog>;
  let confirmed: number;
  let dismissed: number;

  const setVisible = async (visible: boolean): Promise<void> => {
    fixture.componentRef.setInput('visible', visible);
    await fixture.whenStable();
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(InterventionSyncDiscardDialog);
    await fixture.whenStable();

    confirmed = 0;
    dismissed = 0;
    fixture.componentInstance.confirmed.subscribe(() => confirmed++);
    fixture.componentInstance.dismissed.subscribe(() => dismissed++);
  });

  it('should stay closed until visible is set', () => {
    expect(content()).toBeNull();
  });

  it('should open once visible', async () => {
    await setVisible(true);

    expect(content()).not.toBeNull();
  });

  it('should emit confirmed on Discard', async () => {
    await setVisible(true);

    confirmButton().click();

    expect(confirmed).toBe(1);
  });

  it('should emit dismissed on Cancel without emitting confirmed', async () => {
    await setVisible(true);

    cancelButton().click();

    expect(dismissed).toBe(1);
    expect(confirmed).toBe(0);
  });
});
