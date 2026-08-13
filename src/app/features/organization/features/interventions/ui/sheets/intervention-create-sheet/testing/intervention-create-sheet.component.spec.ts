import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { InterventionTemplateOutput } from '@features/organization/features/interventions/models';
import { InterventionCreateSheet } from '../intervention-create-sheet.component';

const panel = (): HTMLElement | null =>
  document.querySelector('[data-testid="intervention-create-sheet"]');

const templatePicker = (): HTMLElement | null =>
  document.querySelector('[data-testid="intervention-create-template-picker"]');

const templates: readonly InterventionTemplateOutput[] = [
  { id: 'template-1', name: 'Annual inspection round' } as InterventionTemplateOutput,
];

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

  it('should hide the template picker when the organization has no templates', async () => {
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();

    expect(templatePicker()).toBeNull();
  });

  it('should show the template picker and emit the picked template on confirm', async () => {
    const emitted: string[] = [];
    fixture.componentInstance.templateInstantiated.subscribe((templateId: string): void => {
      emitted.push(templateId);
    });

    fixture.componentRef.setInput('visible', true);
    fixture.componentRef.setInput('templates', templates);
    await fixture.whenStable();

    expect(templatePicker()).not.toBeNull();

    const confirmButton = document.querySelector<HTMLButtonElement>(
      '[data-testid="intervention-create-template-confirm"]',
    );
    expect(confirmButton?.disabled).toBe(true);

    fixture.componentInstance['selectedTemplateId'].set('template-1');
    await fixture.whenStable();

    expect(confirmButton?.disabled).toBe(false);

    confirmButton?.click();
    await fixture.whenStable();

    expect(emitted).toEqual(['template-1']);
  });

  it('should disable the confirm button while instantiating', async () => {
    fixture.componentRef.setInput('visible', true);
    fixture.componentRef.setInput('templates', templates);
    fixture.componentRef.setInput('instantiating', true);
    await fixture.whenStable();

    fixture.componentInstance['selectedTemplateId'].set('template-1');
    await fixture.whenStable();

    const confirmButton = document.querySelector<HTMLButtonElement>(
      '[data-testid="intervention-create-template-confirm"]',
    );
    expect(confirmButton?.disabled).toBe(true);
  });
});
