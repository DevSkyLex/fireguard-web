import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { NewChannelDraft } from '../models';
import { NewChannelDialog } from '../new-channel-dialog.component';

const panel = (): HTMLElement | null =>
  document.querySelector('[data-testid="new-channel-dialog"]');

const nameInput = (): HTMLInputElement | null =>
  panel()?.querySelector('[data-testid="new-channel-name"]') ?? null;

const form = (): HTMLFormElement | null => panel()?.querySelector('form') ?? null;

const submitButton = (): HTMLButtonElement | null =>
  panel()?.querySelector('[data-testid="new-channel-submit"]') ?? null;

describe('NewChannelDialog', () => {
  let fixture: ComponentFixture<NewChannelDialog>;
  let submissions: NewChannelDraft[];
  let visibility: boolean[];

  const typeName = async (value: string): Promise<void> => {
    const input = nameInput();
    if (!input) return;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  };
  const submit = async (): Promise<void> => {
    form()?.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  };

  async function open(): Promise<void> {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(NewChannelDialog);
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();

    submissions = [];
    visibility = [];
    fixture.componentInstance.submitted.subscribe((value) => submissions.push(value));
    fixture.componentInstance.visibleChange.subscribe((value) => visibility.push(value));
  }

  afterEach(() => TestBed.resetTestingModule());

  it('should render nothing until the page opens it', async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    fixture = TestBed.createComponent(NewChannelDialog);
    await fixture.whenStable();

    expect(panel()).toBeNull();
  });

  it('should refuse a blank name', async () => {
    await open();
    await submit();

    expect(submissions).toEqual([]);
    expect(panel()?.textContent).toContain('Give the channel a name');
  });

  it('should refuse a name shorter than two characters', async () => {
    await open();
    await typeName('a');
    await submit();

    expect(submissions).toEqual([]);
    expect(panel()?.textContent).toContain('Use between 2 and 80 characters.');
  });

  it('should emit the trimmed name with no parent when none was picked', async () => {
    await open();
    await typeName('  Incident room  ');
    await submit();

    expect(submissions).toEqual([{ name: 'Incident room', parentChannelId: null }]);
  });

  it('should clear the draft after a successful submit', async () => {
    await open();
    await typeName('Incident room');
    await submit();

    expect(nameInput()?.value).toBe('');
  });

  it('should close itself once the form validates', async () => {
    await open();
    await typeName('Incident room');
    await submit();

    expect(visibility).toEqual([false]);
  });

  it('should lock the submit control while a request is in flight', async () => {
    await open();
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();

    expect(submitButton()?.disabled).toBe(true);
  });

  it('should cancel without submitting anything', async () => {
    await open();
    await typeName('Incident room');

    panel()?.querySelector('[data-testid="new-channel-cancel"]')?.dispatchEvent(new Event('click'));
    await fixture.whenStable();

    expect(submissions).toEqual([]);
    expect(visibility).toEqual([false]);
  });

  it('should place cancel before the submit control in the DOM', async () => {
    await open();

    const buttons: HTMLButtonElement[] = Array.from(
      panel()?.querySelectorAll('button[type]') ?? [],
    );
    const cancelIndex: number = buttons.findIndex(
      (button: HTMLButtonElement): boolean => button.dataset['testid'] === 'new-channel-cancel',
    );
    const submitIndex: number = buttons.findIndex(
      (button: HTMLButtonElement): boolean => button.dataset['testid'] === 'new-channel-submit',
    );

    expect(cancelIndex).toBeGreaterThanOrEqual(0);
    expect(cancelIndex).toBeLessThan(submitIndex);
  });

  it('should offer no parent field when there are no root-channel candidates', async () => {
    await open();

    expect(panel()?.querySelector('[data-testid="new-channel-parent"]')).toBeNull();
  });
});
