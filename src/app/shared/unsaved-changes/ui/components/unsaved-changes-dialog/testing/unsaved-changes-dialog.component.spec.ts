import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { UnsavedChangesDialog } from '../unsaved-changes-dialog.component';

const panel = (): HTMLElement | null =>
  document.querySelector('[data-testid="unsaved-changes-dialog"]');

const discardButton = (): HTMLButtonElement | null =>
  panel()?.querySelector('[data-testid="unsaved-changes-discard"]') ?? null;

const cancelButton = (): HTMLButtonElement | null =>
  panel()?.querySelector('button[hlmalertdialogcancel]') ?? null;

describe('UnsavedChangesDialog', () => {
  let fixture: ComponentFixture<UnsavedChangesDialog>;
  let confirmations: number;
  let dismissals: number;

  async function open(): Promise<void> {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(UnsavedChangesDialog);
    fixture.componentRef.setInput('state', 'open');
    await fixture.whenStable();

    confirmations = 0;
    dismissals = 0;
    fixture.componentInstance.confirmed.subscribe(() => confirmations++);
    fixture.componentInstance.dismissed.subscribe(() => dismissals++);
  }

  afterEach(() => TestBed.resetTestingModule());

  it('should render nothing while closed', async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    fixture = TestBed.createComponent(UnsavedChangesDialog);
    fixture.componentRef.setInput('state', 'closed');
    await fixture.whenStable();

    expect(panel()).toBeNull();
  });

  it('should render the fixed discard question once open', async () => {
    await open();

    expect(panel()?.textContent).toContain('Discard unsaved changes?');
  });

  it('should emit confirmed when the discard action is activated', async () => {
    await open();

    discardButton()?.dispatchEvent(new Event('click'));
    await fixture.whenStable();

    expect(confirmations).toBe(1);
    expect(dismissals).toBe(0);
  });

  it('should emit dismissed when cancel is activated', async () => {
    await open();

    cancelButton()?.dispatchEvent(new Event('click'));
    await fixture.whenStable();

    expect(dismissals).toBe(1);
    expect(confirmations).toBe(0);
  });

  it('should place cancel before the discard action in the DOM', async () => {
    await open();

    const buttons: HTMLButtonElement[] = Array.from(panel()?.querySelectorAll('button') ?? []);
    const cancelIndex: number = buttons.findIndex((button: HTMLButtonElement): boolean =>
      button.hasAttribute('hlmalertdialogcancel'),
    );
    const discardIndex: number = buttons.findIndex(
      (button: HTMLButtonElement): boolean =>
        button.dataset['testid'] === 'unsaved-changes-discard',
    );

    expect(cancelIndex).toBeGreaterThanOrEqual(0);
    expect(cancelIndex).toBeLessThan(discardIndex);
  });
});
