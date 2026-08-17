import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { ChannelDeleteDialog } from '../channel-delete-dialog.component';

const panel = (): HTMLElement | null =>
  document.querySelector('[data-testid="channel-delete-dialog"]');

const confirmButton = (): HTMLButtonElement | null =>
  panel()?.querySelector('[data-testid="channel-delete-confirm"]') ?? null;

describe('ChannelDeleteDialog', () => {
  let fixture: ComponentFixture<ChannelDeleteDialog>;
  let confirmations: number;
  let visibility: boolean[];

  async function open(): Promise<void> {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(ChannelDeleteDialog);
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();

    confirmations = 0;
    visibility = [];
    fixture.componentInstance.confirmed.subscribe(() => confirmations++);
    fixture.componentInstance.visibleChange.subscribe((value) => visibility.push(value));
  }

  afterEach(() => TestBed.resetTestingModule());

  it('should render nothing until the page opens it', async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    fixture = TestBed.createComponent(ChannelDeleteDialog);
    await fixture.whenStable();

    expect(panel()).toBeNull();
  });

  it('should emit confirmed when the operator confirms', async () => {
    await open();
    confirmButton()?.dispatchEvent(new Event('click'));
    await fixture.whenStable();

    expect(confirmations).toBe(1);
  });

  it('should stay open and busy-locked while the delete write is in flight', async () => {
    await open();
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();

    expect(confirmButton()?.disabled).toBe(true);
    expect(visibility).toEqual([]);
  });

  it('should refuse a second confirm while one is already in flight', async () => {
    await open();
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();

    confirmButton()?.dispatchEvent(new Event('click'));
    await fixture.whenStable();

    expect(confirmations).toBe(0);
  });

  it('should show the write failure inline without closing', async () => {
    await open();
    fixture.componentRef.setInput('error', { message: 'The channel could not be deleted.' });
    await fixture.whenStable();

    expect(panel()?.querySelector('[data-testid="channel-delete-error"]')?.textContent).toContain(
      'The channel could not be deleted.',
    );
    expect(visibility).toEqual([]);
  });
});
