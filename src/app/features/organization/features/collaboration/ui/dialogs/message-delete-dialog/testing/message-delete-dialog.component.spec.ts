import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { toStoreError } from '@core/request-state';
import { MessageDeleteDialog } from '../message-delete-dialog.component';

const panel = (): HTMLElement | null =>
  document.querySelector('[data-testid="message-delete-dialog"]');

const confirmButton = (): HTMLButtonElement | null =>
  panel()?.querySelector('[data-testid="message-delete-confirm"]') ?? null;

describe('MessageDeleteDialog', () => {
  let fixture: ComponentFixture<MessageDeleteDialog>;
  let confirmations: number;
  let visibility: boolean[];

  async function open(): Promise<void> {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(MessageDeleteDialog);
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
    fixture = TestBed.createComponent(MessageDeleteDialog);
    await fixture.whenStable();

    expect(panel()).toBeNull();
  });

  it('should say the tombstone stays visible, then emit confirmed', async () => {
    await open();

    expect(panel()?.textContent).toContain('This message was deleted');

    confirmButton()?.dispatchEvent(new Event('click'));
    await fixture.whenStable();

    expect(confirmations).toBe(1);
  });

  it('should stay open and busy-locked while the delete write is in flight', async () => {
    await open();
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();

    expect(confirmButton()?.disabled).toBe(true);
    expect(confirmButton()?.getAttribute('aria-busy')).toBe('true');
    expect(visibility).toEqual([]);

    confirmButton()?.dispatchEvent(new Event('click'));
    await fixture.whenStable();
    expect(confirmations).toBe(0);
  });

  it('should surface the write error inline instead of closing', async () => {
    await open();
    fixture.componentRef.setInput('error', toStoreError({ status: 403 }));
    await fixture.whenStable();

    expect(panel()?.querySelector('[data-testid="message-delete-error"]')).not.toBeNull();
    expect(visibility).toEqual([]);
  });
});
