import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { InterventionCreateSheet } from '../intervention-create-sheet.component';

const panel = (): HTMLElement | null =>
  document.querySelector('[data-testid="intervention-create-sheet"]');

const pressEscape = (): void => {
  panel()?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
};

describe('InterventionCreateSheet', () => {
  let fixture: ComponentFixture<InterventionCreateSheet>;

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(InterventionCreateSheet);
    await fixture.whenStable();
  });

  it('should render the panel only once the page opens it', async () => {
    expect(panel()).toBeNull();

    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();

    expect(panel()).not.toBeNull();

    fixture.componentRef.setInput('visible', false);
    await fixture.whenStable();

    expect(panel()).toBeNull();
  });

  it('should relay a dismissal to the page', async () => {
    const emitted: boolean[] = [];
    fixture.componentInstance.visibleChange.subscribe((open: boolean): void => {
      emitted.push(open);
    });

    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();

    pressEscape();
    await fixture.whenStable();

    expect(emitted).toEqual([false]);
  });

  it('should refuse an accidental dismissal while a creation request is in flight', async () => {
    const emitted: boolean[] = [];
    fixture.componentInstance.visibleChange.subscribe((open: boolean): void => {
      emitted.push(open);
    });

    fixture.componentRef.setInput('visible', true);
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();

    pressEscape();
    await fixture.whenStable();

    expect(emitted).toEqual([]);
    expect(panel()).not.toBeNull();
  });

  it('should close on Cancel, because that is a deliberate exit', async () => {
    const emitted: boolean[] = [];
    fixture.componentInstance.visibleChange.subscribe((open: boolean): void => {
      emitted.push(open);
    });

    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();

    document
      .querySelector<HTMLButtonElement>('[data-testid="intervention-create-cancel"]')
      ?.click();
    await fixture.whenStable();

    expect(emitted).toEqual([false]);
  });
});
