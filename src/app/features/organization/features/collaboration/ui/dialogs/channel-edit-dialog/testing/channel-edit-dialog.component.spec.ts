import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { ChannelEditDraft } from '../../../forms/channel-edit-form';
import { ChannelEditDialog } from '../channel-edit-dialog.component';

const panel = (): HTMLElement | null =>
  document.querySelector('[data-testid="channel-edit-dialog"]');

const nameInput = (): HTMLInputElement | null =>
  panel()?.querySelector('[data-testid="edit-channel-name"]') ?? null;

const form = (): HTMLFormElement | null => panel()?.querySelector('form') ?? null;

describe('ChannelEditDialog', () => {
  let fixture: ComponentFixture<ChannelEditDialog>;
  let submissions: ChannelEditDraft[];
  let visibility: boolean[];

  const submit = async (): Promise<void> => {
    form()?.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  };

  async function open(): Promise<void> {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(ChannelEditDialog);
    fixture.componentRef.setInput('visible', true);
    fixture.componentRef.setInput('name', 'general');
    await fixture.whenStable();

    submissions = [];
    visibility = [];
    fixture.componentInstance.submitted.subscribe((value) => submissions.push(value));
    fixture.componentInstance.visibleChange.subscribe((value) => visibility.push(value));
  }

  afterEach(() => TestBed.resetTestingModule());

  it('should render nothing until the page opens it', async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    fixture = TestBed.createComponent(ChannelEditDialog);
    await fixture.whenStable();

    expect(panel()).toBeNull();
  });

  it('should seed the form from the current name', async () => {
    await open();

    expect(nameInput()?.value).toBe('general');
  });

  it('should forward a validated submit and close', async () => {
    await open();
    await submit();

    expect(submissions).toEqual([{ name: 'general', parentChannelId: null }]);
    expect(visibility).toEqual([false]);
  });

  it('should relay a cancel without submitting anything', async () => {
    await open();

    panel()
      ?.querySelector('[data-testid="edit-channel-cancel"]')
      ?.dispatchEvent(new Event('click'));
    await fixture.whenStable();

    expect(submissions).toEqual([]);
    expect(visibility).toEqual([false]);
  });

  it('should natively disable the submit control while a write is in flight', async () => {
    await open();
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();

    const submitButton = panel()?.querySelector(
      '[data-testid="edit-channel-submit"]',
    ) as HTMLButtonElement | null;

    expect(submitButton?.disabled).toBe(true);
  });
});
