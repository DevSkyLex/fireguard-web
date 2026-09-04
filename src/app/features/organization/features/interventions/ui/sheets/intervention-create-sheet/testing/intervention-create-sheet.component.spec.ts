import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import type {
  InterventionTemplateInstantiateRequest,
  InterventionTemplateOutput,
} from '@features/organization/features/interventions/models';
import { InterventionCreateForm } from '../../../forms/intervention-create-form';
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

const unsavedChangesDialog = (): HTMLElement | null =>
  document.querySelector('[data-testid="unsaved-changes-dialog"]');

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
    const emitted: InterventionTemplateInstantiateRequest[] = [];
    fixture.componentInstance.templateInstantiated.subscribe(
      (request: InterventionTemplateInstantiateRequest): void => {
        emitted.push(request);
      },
    );

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

    expect(emitted).toEqual([{ templateId: 'template-1' }]);
  });

  it('should include the drafted overrides in the emitted request', async () => {
    const emitted: InterventionTemplateInstantiateRequest[] = [];
    fixture.componentInstance.templateInstantiated.subscribe(
      (request: InterventionTemplateInstantiateRequest): void => {
        emitted.push(request);
      },
    );

    fixture.componentRef.setInput('visible', true);
    fixture.componentRef.setInput('templates', templates);
    await fixture.whenStable();

    fixture.componentInstance['selectedTemplateId'].set('template-1');
    fixture.componentInstance['overrideName'].set('Spring round');
    fixture.componentInstance['overrideSite'].set('/api/facilities/site-1');
    await fixture.whenStable();

    document
      .querySelector<HTMLButtonElement>('[data-testid="intervention-create-template-confirm"]')
      ?.click();
    await fixture.whenStable();

    expect(emitted).toEqual([
      { templateId: 'template-1', name: 'Spring round', site: '/api/facilities/site-1' },
    ]);
  });

  it('should reset the override drafts when the panel closes', async () => {
    fixture.componentRef.setInput('visible', true);
    fixture.componentRef.setInput('templates', templates);
    await fixture.whenStable();

    fixture.componentInstance['overrideName'].set('Spring round');

    fixture.componentRef.setInput('visible', false);
    await fixture.whenStable();

    expect(fixture.componentInstance['overrideName']()).toBe('');
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

  it('should forward a duplicate prefill to the form', async () => {
    fixture.componentRef.setInput('visible', true);
    fixture.componentRef.setInput('prefill', {
      name: 'Roof round (copy)',
      type: 'inventory',
      priority: 'high',
      site: '',
      responsible: '',
    });
    await fixture.whenStable();

    const nameInput: HTMLInputElement | null = document.querySelector(
      '[data-testid="intervention-create-name"]',
    );

    expect(nameInput?.value).toBe('Roof round (copy)');
  });

  it('should confirm before an Escape throws away a drafted override', async () => {
    const emitted: boolean[] = [];
    fixture.componentInstance.visibleChange.subscribe((open: boolean): void => {
      emitted.push(open);
    });

    fixture.componentRef.setInput('visible', true);
    fixture.componentRef.setInput('templates', templates);
    await fixture.whenStable();

    fixture.componentInstance['selectedTemplateId'].set('template-1');
    fixture.componentInstance['overrideName'].set('Riser round — north wing');
    await fixture.whenStable();

    pressEscape();
    await fixture.whenStable();

    expect(emitted).toEqual([]);
    expect(unsavedChangesDialog()).not.toBeNull();
    expect(panel()).not.toBeNull();
  });

  it('should treat a bare template pick as nothing to lose, since re-picking is one click', async () => {
    const emitted: boolean[] = [];
    fixture.componentInstance.visibleChange.subscribe((open: boolean): void => {
      emitted.push(open);
    });

    fixture.componentRef.setInput('visible', true);
    fixture.componentRef.setInput('templates', templates);
    await fixture.whenStable();

    fixture.componentInstance['selectedTemplateId'].set('template-1');
    await fixture.whenStable();

    pressEscape();
    await fixture.whenStable();

    expect(emitted).toEqual([false]);
    expect(unsavedChangesDialog()).toBeNull();
  });

  it('should confirm before Cancel throws away a started form', async () => {
    const emitted: boolean[] = [];
    fixture.componentInstance.visibleChange.subscribe((open: boolean): void => {
      emitted.push(open);
    });

    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();

    fixture.debugElement
      .query(By.directive(InterventionCreateForm))
      .componentInstance.dirtyChanged.emit(true);
    await fixture.whenStable();

    document
      .querySelector<HTMLButtonElement>('[data-testid="intervention-create-cancel"]')
      ?.click();
    await fixture.whenStable();

    expect(emitted).toEqual([]);
    expect(unsavedChangesDialog()).not.toBeNull();
  });

  it('should close once the planner confirms the discard', async () => {
    const emitted: boolean[] = [];
    fixture.componentInstance.visibleChange.subscribe((open: boolean): void => {
      emitted.push(open);
    });

    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();

    fixture.componentInstance['overrideName'].set('Riser round — north wing');
    await fixture.whenStable();

    fixture.componentInstance['requestClose']();
    fixture.componentInstance['onUnsavedChangesConfirmed']();
    await fixture.whenStable();

    expect(emitted).toEqual([false]);
    expect(fixture.componentInstance['unsavedChangesDialogState']()).toBe('closed');
  });
  it('should preserve the blank draft when switching creation modes', async () => {
    fixture.componentRef.setInput('templates', templates);
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();
    const name = document.querySelector<HTMLInputElement>(
      '[data-testid="intervention-create-name"]',
    );
    if (!name) throw new Error('The blank form must expose its name field');
    name.value = 'Saved blank draft';
    name.dispatchEvent(new Event('input'));
    document
      .querySelector<HTMLButtonElement>('[data-testid="intervention-create-mode-template"]')
      ?.click();
    await fixture.whenStable();
    expect(fixture.componentInstance['creationMode']()).toBe('template');
    document
      .querySelector<HTMLButtonElement>('[data-testid="intervention-create-mode-blank"]')
      ?.click();
    await fixture.whenStable();
    expect(fixture.componentInstance['creationMode']()).toBe('blank');
    expect(
      document.querySelector<HTMLInputElement>('[data-testid="intervention-create-name"]')?.value,
    ).toBe('Saved blank draft');
  });

  it('should open the preselected template without submitting it', async () => {
    const emitted = vi.fn();
    fixture.componentInstance.templateInstantiated.subscribe(emitted);
    fixture.componentRef.setInput('templates', templates);
    fixture.componentRef.setInput('initialTemplateId', 'template-1');
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();
    expect(fixture.componentInstance['creationMode']()).toBe('template');
    expect(fixture.componentInstance['selectedTemplateId']()).toBe('template-1');
    expect(emitted).not.toHaveBeenCalled();
  });
});
