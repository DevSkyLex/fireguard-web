import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { ChannelEditForm } from '../channel-edit-form.component';
import type { EditChannelDraft } from '../models';

describe('ChannelEditForm', () => {
  let fixture: ComponentFixture<ChannelEditForm>;
  let submissions: EditChannelDraft[];
  let cancellations: number;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const nameInput = (): HTMLInputElement =>
    root().querySelector('[data-testid="edit-channel-name"]') as HTMLInputElement;
  const form = (): HTMLFormElement => root().querySelector('form') as HTMLFormElement;
  const submitButton = (): HTMLButtonElement =>
    root().querySelector('[data-testid="edit-channel-submit"]') as HTMLButtonElement;
  const cancelButton = (): HTMLButtonElement =>
    root().querySelector('[data-testid="edit-channel-cancel"]') as HTMLButtonElement;

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

    fixture = TestBed.createComponent(ChannelEditForm);
    fixture.componentRef.setInput('name', 'general');
    fixture.componentRef.setInput('parentChannelId', null);
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();

    submissions = [];
    cancellations = 0;
    fixture.componentInstance.submitted.subscribe((value) => submissions.push(value));
    fixture.componentInstance.cancelled.subscribe(() => cancellations++);
  });

  it('should seed the draft from the current name once opened', async () => {
    expect(nameInput().value).toBe('general');
  });

  it('should reseed the draft when a different channel is opened', async () => {
    fixture.componentRef.setInput('visible', false);
    await fixture.whenStable();
    fixture.componentRef.setInput('name', 'incidents');
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();

    expect(nameInput().value).toBe('incidents');
  });

  it('should refuse a blank name', async () => {
    await typeName('');
    await submit();

    expect(submissions).toEqual([]);
    expect(root().textContent).toContain('Give the channel a name');
  });

  it('should emit the trimmed name with no parent when none was picked', async () => {
    await typeName('  Incident room  ');
    await submit();

    expect(submissions).toEqual([{ name: 'Incident room', parentChannelId: null }]);
  });

  it('should emit cancelled without submitting anything', async () => {
    cancelButton().dispatchEvent(new Event('click'));

    expect(cancellations).toBe(1);
    expect(submissions).toEqual([]);
  });

  it('should natively disable both cancel and submit while a write is in flight', async () => {
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();

    expect(submitButton().disabled).toBe(true);
    expect(cancelButton().disabled).toBe(true);
  });

  it('should offer no parent field when there are no root-channel candidates', async () => {
    expect(root().querySelector('[data-testid="edit-channel-parent"]')).toBeNull();
  });
});
