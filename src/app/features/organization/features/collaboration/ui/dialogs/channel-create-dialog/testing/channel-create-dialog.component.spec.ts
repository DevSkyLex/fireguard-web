import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { ChannelCreateDraft } from '../../../forms/channel-create-form';
import { ChannelCreateDialog } from '../channel-create-dialog.component';

const panel = (): HTMLElement | null =>
  document.querySelector('[data-testid="channel-create-dialog"]');

const nameInput = (): HTMLInputElement | null =>
  panel()?.querySelector('[data-testid="channel-create-name"]') ?? null;

const form = (): HTMLFormElement | null => panel()?.querySelector('form') ?? null;

describe('ChannelCreateDialog', () => {
  let fixture: ComponentFixture<ChannelCreateDialog>;
  let submissions: ChannelCreateDraft[];
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

    fixture = TestBed.createComponent(ChannelCreateDialog);
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
    fixture = TestBed.createComponent(ChannelCreateDialog);
    await fixture.whenStable();

    expect(panel()).toBeNull();
  });

  it('should forward a validated submit and close', async () => {
    await open();
    await typeName('Incident room');
    await submit();

    expect(submissions).toEqual([{ name: 'Incident room', parentChannelId: null }]);
    expect(visibility).toEqual([false]);
  });

  it('should forward pending to the create form, locking its submit control', async () => {
    await open();
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();

    const submitButton = panel()?.querySelector(
      '[data-testid="channel-create-submit"]',
    ) as HTMLButtonElement | null;

    expect(submitButton?.disabled).toBe(true);
  });

  it('should relay a cancel without submitting anything', async () => {
    await open();
    await typeName('Incident room');

    panel()?.querySelector('[data-testid="new-channel-cancel"]')?.dispatchEvent(new Event('click'));
    await fixture.whenStable();

    expect(submissions).toEqual([]);
    expect(visibility).toEqual([false]);
  });

  it('should offer no parent field when there are no root-channel candidates', async () => {
    await open();

    expect(panel()?.querySelector('[data-testid="new-channel-parent"]')).toBeNull();
  });
});
