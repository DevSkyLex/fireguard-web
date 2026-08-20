import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type {
  InspectionEditState,
  InspectionEditTarget,
  InspectionOutput,
  UpdateInspectionInput,
} from '@features/organization/features/inspections/models';
import { InspectionInformationPanel } from '../inspection-information-panel.component';

const IDLE_EDIT_STATE: InspectionEditState = {
  open: null,
  saving: null,
  failed: null,
  failure: null,
};

const INSPECTION: InspectionOutput = {
  '@id': '/api/organizations/org-1/inspections/inspection-1',
  '@type': 'Inspection',
  id: 'inspection-1',
  organizationId: 'org-1',
  equipmentId: 'equipment-1',
  facilityId: null,
  result: 'pass',
  status: 'draft',
  performedAt: '2026-08-10T00:00:00Z',
  inspector: {
    type: 'user',
    id: 'member-1',
    firstName: 'Ada',
    lastName: 'Lovelace',
    displayName: 'Ada Lovelace',
    avatarUrl: null,
    organizationName: null,
  },
  checklistId: null,
  notes: 'Everything looked fine',
  signature: null,
  nonConformitiesCount: 0,
  createdAt: '2026-08-10T00:00:00Z',
  updatedAt: '2026-08-10T00:00:00Z',
};

describe('InspectionInformationPanel', () => {
  let fixture: ComponentFixture<InspectionInformationPanel>;
  let patches: UpdateInspectionInput[];
  let editTargets: (InspectionEditTarget | null)[];

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const byTestId = (id: string): HTMLElement | null =>
    root().querySelector(`[data-testid="${id}"]`);
  const saveButton = (): HTMLButtonElement | undefined =>
    Array.from(root().querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === 'Save',
    );

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    });

    fixture = TestBed.createComponent(InspectionInformationPanel);
    fixture.componentRef.setInput('inspection', INSPECTION);
    fixture.componentRef.setInput('editable', true);
    fixture.componentRef.setInput('editState', IDLE_EDIT_STATE);
    fixture.componentRef.setInput('organizationId', 'org-1');
    await fixture.whenStable();

    patches = [];
    editTargets = [];
    fixture.componentInstance.detailsChanged.subscribe((patch) => patches.push(patch));
    fixture.componentInstance.editTargetChanged.subscribe((target) => editTargets.push(target));
  });

  it('should render the inspector name and the performed date', () => {
    expect(root().textContent).toContain('Ada Lovelace');
    expect(root().textContent).toContain('2026-08-10');
  });

  it('should show a placeholder for an unassigned facility', () => {
    expect(byTestId('inspection-field-facility')?.textContent).toContain('Not specified');
  });

  it('should show a placeholder for an unassigned checklist', () => {
    expect(byTestId('inspection-field-checklist')?.textContent).toContain('Not specified');
  });

  it('should render the resolved checklist name', async () => {
    fixture.componentRef.setInput('inspection', { ...INSPECTION, checklistId: 'checklist-1' });
    fixture.componentRef.setInput('checklistName', 'Monthly fire panel check');
    await fixture.whenStable();

    expect(byTestId('inspection-field-checklist')?.textContent).toContain(
      'Monthly fire panel check',
    );
  });

  it('should fall back to a neutral label when the checklist name could not be resolved', async () => {
    fixture.componentRef.setInput('inspection', { ...INSPECTION, checklistId: 'checklist-1' });
    await fixture.whenStable();

    expect(byTestId('inspection-field-checklist')?.textContent).toContain(
      'Checklist deleted or unavailable',
    );
  });

  it('should ask the page to open the notes editor', () => {
    byTestId('inspection-field-notes')?.querySelector<HTMLButtonElement>('button')?.click();

    expect(editTargets).toEqual(['notes']);
  });

  it('should send an empty notes draft as null, not as an empty string', async () => {
    byTestId('inspection-field-notes')?.querySelector<HTMLButtonElement>('button')?.click();
    fixture.componentRef.setInput('editState', { ...IDLE_EDIT_STATE, open: 'notes' });
    await fixture.whenStable();

    const textarea: HTMLTextAreaElement | null | undefined =
      byTestId('inspection-field-notes')?.querySelector<HTMLTextAreaElement>('textarea');
    if (textarea) {
      textarea.value = '   ';
      textarea.dispatchEvent(new Event('input'));
    }
    await fixture.whenStable();

    saveButton()?.click();

    expect(patches).toEqual([{ notes: null }]);
  });

  it('should not let an unchanged performed date be saved', async () => {
    byTestId('inspection-field-performed-at')?.querySelector<HTMLButtonElement>('button')?.click();
    fixture.componentRef.setInput('editState', { ...IDLE_EDIT_STATE, open: 'performedAt' });
    await fixture.whenStable();

    expect(saveButton()?.hasAttribute('disabled')).toBe(true);
  });

  it('should send the drafted performed date on save', async () => {
    byTestId('inspection-field-performed-at')?.querySelector<HTMLButtonElement>('button')?.click();
    fixture.componentRef.setInput('editState', { ...IDLE_EDIT_STATE, open: 'performedAt' });
    await fixture.whenStable();

    const input: HTMLInputElement | null | undefined = byTestId(
      'inspection-field-performed-at',
    )?.querySelector<HTMLInputElement>('input');
    if (input) {
      input.value = '2026-09-01';
      input.dispatchEvent(new Event('input'));
    }
    await fixture.whenStable();

    saveButton()?.click();

    expect(patches).toEqual([{ performedAt: '2026-09-01' }]);
  });

  it('should render each field row as a disabled trigger when not editable', async () => {
    fixture.componentRef.setInput('editable', false);
    await fixture.whenStable();

    const trigger = byTestId('inspection-field-signature')?.querySelector('button');
    expect(trigger?.hasAttribute('disabled')).toBe(true);
  });
});
