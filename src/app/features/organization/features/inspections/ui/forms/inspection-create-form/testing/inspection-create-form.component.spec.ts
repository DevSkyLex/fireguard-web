import {
  computed,
  provideZonelessChangeDetection,
  signal,
  type WritableSignal,
} from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { INTERACTION_CAPABILITIES_PORT } from '@core/interaction-capabilities';
import type { CreateInspectionInput } from '@features/organization/features/inspections/models';
import { InspectionCreateForm } from '../inspection-create-form.component';
import type { InspectionCreateFormDraft } from '../models';

describe('InspectionCreateForm', () => {
  let fixture: ComponentFixture<InspectionCreateForm>;
  let element: HTMLElement;
  const mobile = signal(false);

  /**
   * Function beforeAll
   * @description Supplies the observer and scrolling APIs used by the native drawer command list in jsdom.
   * @returns {void}
   */
  beforeAll(() => {
    globalThis.ResizeObserver ??= class {
      public observe(): void {}
      public unobserve(): void {}
      public disconnect(): void {}
    } as unknown as typeof ResizeObserver;
    HTMLElement.prototype.scrollIntoView ??= (): void => {};
  });

  const fill = async (testId: string, value: string): Promise<void> => {
    const input: HTMLInputElement = element.querySelector<HTMLInputElement>(
      `[data-testid="${testId}"]`,
    ) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  };

  const submit = async (): Promise<void> => {
    element.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
  };

  const setModel = async (draft: InspectionCreateFormDraft): Promise<void> => {
    (
      fixture.componentInstance as unknown as {
        model: WritableSignal<InspectionCreateFormDraft>;
      }
    ).model.set(draft);
    await fixture.whenStable();
  };

  beforeEach(async () => {
    mobile.set(false);
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        {
          provide: INTERACTION_CAPABILITIES_PORT,
          useValue: {
            isMobileInteractionMode: mobile,
            mode: computed(() => (mobile() ? 'mobile' : 'desktop')),
          },
        },
      ],
    });

    fixture = TestBed.createComponent(InspectionCreateForm);
    await fixture.whenStable();

    element = fixture.nativeElement as HTMLElement;
  });

  it('should choose equipment in the mobile drawer without replacing the draft when interaction mode changes', async () => {
    fixture.componentRef.setInput('equipmentOptions', [
      {
        value: 'equipment-2',
        label: 'Extinguisher 2',
        typeLabel: 'Extinguisher',
        secondary: 'North site',
      },
    ]);
    await fill('inspection-create-inspector-name', 'Ada');
    const fieldTree = fixture.componentInstance['createForm'];
    mobile.set(true);
    await fixture.whenStable();
    element
      .querySelector<HTMLButtonElement>('[data-testid="inspection-create-equipment-mobile"]')
      ?.click();
    await fixture.whenStable();
    expect(document.querySelector('hlm-drawer-content')).not.toBeNull();
    mobile.set(false);
    await fixture.whenStable();
    expect(document.querySelector('hlm-drawer-content')).not.toBeNull();
    document
      .querySelector<HTMLButtonElement>('[data-testid="inspection-equipment-mobile-option"]')
      ?.click();
    await fixture.whenStable();
    expect(fieldTree.equipmentId().value()).toBe('equipment-2');
    expect(fieldTree.equipmentId().dirty()).toBe(true);
    expect(fieldTree.inspectorName().value()).toBe('Ada');
    expect(fixture.componentInstance['createForm']).toBe(fieldTree);
    expect(element.querySelector('hlm-combobox')).not.toBeNull();
  });

  it('should stay quiet until the form is touched', () => {
    expect(element.textContent).not.toContain('Choose the inspected equipment.');
  });

  it('shows the equipment empty state only when the mobile search has no matches', async () => {
    mobile.set(true);
    fixture.componentRef.setInput('equipmentOptions', [
      {
        value: 'equipment-2',
        label: 'Extinguisher 2',
        typeLabel: 'Extinguisher',
        secondary: 'North site',
      },
    ]);
    await fixture.whenStable();
    element
      .querySelector<HTMLButtonElement>('[data-testid="inspection-create-equipment-mobile"]')
      ?.click();
    await fixture.whenStable();
    const drawer = document.querySelector('hlm-drawer-content');
    expect(drawer?.querySelector('[hlmCommandEmpty]')).toBeNull();
    const search = drawer?.querySelector<HTMLInputElement>('#inspection-equipment-search');
    expect(search).not.toBeNull();
    if (!search) throw new Error('Equipment search is missing');
    search.value = 'no-such-equipment';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
    expect(drawer?.querySelector('[hlmCommandEmpty]')?.textContent).toContain(
      'No equipment matches.',
    );
    search.value = 'North';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
    expect(drawer?.querySelector('[hlmCommandEmpty]')).toBeNull();
  });

  it('should refuse to emit while required fields are missing, and show the reasons', async () => {
    const emitted: CreateInspectionInput[] = [];
    fixture.componentInstance.submitted.subscribe((value: CreateInspectionInput): void => {
      emitted.push(value);
    });

    await submit();

    expect(emitted).toEqual([]);
    expect(element.textContent).toContain('Choose the inspected equipment.');
    expect(element.textContent).toContain("Choose the inspection's result.");
    expect(element.textContent).toContain('Pick the date the inspection was carried out.');
    expect(element.textContent).toContain('Name the inspector.');
  });

  it('should emit the API-shaped payload once every required field is filled', async () => {
    const emitted: CreateInspectionInput[] = [];
    fixture.componentInstance.submitted.subscribe((value: CreateInspectionInput): void => {
      emitted.push(value);
    });

    await setModel({
      equipmentId: 'equipment-1',
      result: 'pass',
      performedAt: new Date('2026-08-10T00:00:00.000Z'),
      inspectorType: 'user',
      inspectorName: '',
      checklistId: '',
    });
    await fill('inspection-create-inspector-name', 'Ada Lovelace');
    await submit();

    expect(emitted).toEqual([
      {
        equipmentId: 'equipment-1',
        result: 'pass',
        performedAt: '2026-08-10T00:00:00.000Z',
        inspectorType: 'user',
        inspectorName: 'Ada Lovelace',
        checklistId: null,
      },
    ]);
  });

  it('should emit the picked checklistId when one is chosen', async () => {
    const emitted: CreateInspectionInput[] = [];
    fixture.componentInstance.submitted.subscribe((value: CreateInspectionInput): void => {
      emitted.push(value);
    });

    await setModel({
      equipmentId: 'equipment-1',
      result: 'pass',
      performedAt: new Date('2026-08-10T00:00:00.000Z'),
      inspectorType: 'user',
      inspectorName: 'Ada Lovelace',
      checklistId: 'checklist-1',
    });
    await submit();

    expect(emitted).toEqual([
      {
        equipmentId: 'equipment-1',
        result: 'pass',
        performedAt: '2026-08-10T00:00:00.000Z',
        inspectorType: 'user',
        inspectorName: 'Ada Lovelace',
        checklistId: 'checklist-1',
      },
    ]);
  });

  it('should surface the API rejection above the form', async () => {
    fixture.componentRef.setInput('serverError', {
      status: 422,
      violations: [{ propertyPath: 'equipmentId', message: 'This equipment does not exist.' }],
    });
    await fixture.whenStable();

    expect(element.querySelector('[data-testid="inspection-create-error"]')?.textContent).toContain(
      'This equipment does not exist.',
    );
  });

  it('should lock the submit control while a request is in flight', async () => {
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();

    const button: HTMLButtonElement | null = element.querySelector(
      '[data-testid="inspection-create-submit"]',
    );

    expect(button?.disabled).toBe(true);
    expect(button?.textContent).toContain('Creating…');
  });

  it('should report dirtiness through dirtyChanged as the field tree is touched', async () => {
    const dirtyChanges: boolean[] = [];
    fixture.componentInstance.dirtyChanged.subscribe((dirty: boolean): void => {
      dirtyChanges.push(dirty);
    });
    await fixture.whenStable();

    await fill('inspection-create-inspector-name', 'Ada Lovelace');

    expect(dirtyChanges.at(-1)).toBe(true);
  });
});
