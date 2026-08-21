import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { ChannelCreateForm } from '../channel-create-form.component';
import type { ChannelCreateDraft } from '../models';

describe('ChannelCreateForm', () => {
  let fixture: ComponentFixture<ChannelCreateForm>;
  let submissions: ChannelCreateDraft[];
  let cancellations: number;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const nameInput = (): HTMLInputElement =>
    root().querySelector('[data-testid="channel-create-name"]') as HTMLInputElement;
  const form = (): HTMLFormElement => root().querySelector('form') as HTMLFormElement;
  const submitButton = (): HTMLButtonElement =>
    root().querySelector('[data-testid="channel-create-submit"]') as HTMLButtonElement;

  const typeName = async (value: string): Promise<void> => {
    nameInput().value = value;
    nameInput().dispatchEvent(new Event('input'));
    await fixture.whenStable();
  };
  const submit = async (): Promise<void> => {
    form().dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(ChannelCreateForm);
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();

    submissions = [];
    cancellations = 0;
    fixture.componentInstance.submitted.subscribe((value) => submissions.push(value));
    fixture.componentInstance.cancelled.subscribe(() => cancellations++);
  });

  it('should refuse a blank name', async () => {
    await submit();

    expect(submissions).toEqual([]);
    expect(root().textContent).toContain('Give the channel a name');
  });

  it('should refuse a name shorter than two characters', async () => {
    await typeName('a');
    await submit();

    expect(submissions).toEqual([]);
    expect(root().textContent).toContain('Use between 2 and 80 characters.');
  });

  it('should emit the trimmed name with no parent when none was picked', async () => {
    await typeName('  Incident room  ');
    await submit();

    expect(submissions).toEqual([{ name: 'Incident room', parentChannelId: null }]);
  });

  it('should clear the draft after a successful submit', async () => {
    await typeName('Incident room');
    await submit();

    expect(nameInput().value).toBe('');
  });

  it('should lock the submit control while a request is in flight', async () => {
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();

    expect(submitButton().disabled).toBe(true);
  });

  it('should emit cancelled without submitting anything', async () => {
    await typeName('Incident room');

    root().querySelector('[data-testid="new-channel-cancel"]')?.dispatchEvent(new Event('click'));

    expect(cancellations).toBe(1);
    expect(submissions).toEqual([]);
  });

  it('should clear the draft once the hosting overlay closes', async () => {
    await typeName('Incident room');

    fixture.componentRef.setInput('visible', false);
    await fixture.whenStable();

    expect(nameInput().value).toBe('');
  });

  it('should place cancel before the submit control in the DOM', async () => {
    const buttons: HTMLButtonElement[] = Array.from(root().querySelectorAll('button[type]'));
    const cancelIndex: number = buttons.findIndex(
      (button: HTMLButtonElement): boolean => button.dataset['testid'] === 'new-channel-cancel',
    );
    const submitIndex: number = buttons.findIndex(
      (button: HTMLButtonElement): boolean => button.dataset['testid'] === 'channel-create-submit',
    );

    expect(cancelIndex).toBeGreaterThanOrEqual(0);
    expect(cancelIndex).toBeLessThan(submitIndex);
  });

  it('should offer no parent field when there are no root-channel candidates', async () => {
    expect(root().querySelector('[data-testid="new-channel-parent"]')).toBeNull();
  });
});
