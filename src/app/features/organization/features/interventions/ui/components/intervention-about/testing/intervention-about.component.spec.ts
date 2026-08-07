import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type {
  InterventionEditState,
  InterventionEditTarget,
  InterventionOutput,
  UpdateInterventionInput,
} from '@features/organization/features/interventions/models';
import { InterventionAbout } from '../intervention-about.component';

const IDLE_EDIT_STATE: InterventionEditState = {
  open: null,
  saving: null,
  failed: null,
  failure: null,
};

const intervention: InterventionOutput = {
  '@id': '/api/interventions/intervention-1',
  '@type': 'Intervention',
  id: 'intervention-1',
  organization: '/api/organizations/org-1',
  number: 5,
  type: 'inspection_campaign',
  name: 'Q1 sprinkler inspection',
  description: null,
  status: 'draft',
  allowedTransitions: ['planned', 'abandoned'],
  site: '/api/facilities/site-1',
  responsible: null,
  participants: [],
  labels: [],
  priority: 'normal',
  plannedStartAt: null,
  dueAt: null,
  reviewNote: null,
  revision: 1,
  facilitiesCount: 0,
  equipmentCount: 0,
  inspectionsCount: 0,
  blockersCount: 0,
  workItemsCount: 0,
  completedWorkItemsCount: 0,
  proposedChangesCount: 0,
  commentsCount: 0,
  createdAt: '2026-01-05T09:00:00Z',
  updatedAt: '2026-01-05T09:00:00Z',
};

describe('InterventionAbout', () => {
  let fixture: ComponentFixture<InterventionAbout>;
  let patches: UpdateInterventionInput[];
  let editTargets: (InterventionEditTarget | null)[];

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const byTestId = (id: string): HTMLElement | null =>
    root().querySelector(`[data-testid="${id}"]`);

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(InterventionAbout);
    fixture.componentRef.setInput('intervention', intervention);
    fixture.componentRef.setInput('editState', IDLE_EDIT_STATE);
    fixture.componentRef.setInput('canEditDetails', true);
    await fixture.whenStable();

    patches = [];
    editTargets = [];
    fixture.componentInstance.detailsChanged.subscribe((patch) => patches.push(patch));
    fixture.componentInstance.editTargetChanged.subscribe((target) => editTargets.push(target));
  });

  it('should show the reference number and type', () => {
    expect(root().textContent).toContain('FG-5');
  });

  it('should invite a description when none is recorded', () => {
    expect(byTestId('intervention-description-field')?.textContent).toContain('No description yet');
  });

  it('should ask the page to open the description editor', () => {
    const trigger = byTestId('intervention-description-field') as HTMLElement;
    (trigger.querySelector('button') as HTMLButtonElement).click();

    expect(editTargets).toEqual(['description']);
  });

  it('should send an empty description as null, not as an empty string', async () => {
    fixture.componentRef.setInput('intervention', { ...intervention, description: 'Old text' });
    fixture.componentRef.setInput('editState', { ...IDLE_EDIT_STATE, open: 'description' });
    await fixture.whenStable();

    const textarea = byTestId('intervention-description-input') as HTMLTextAreaElement;
    textarea.value = '   ';
    textarea.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    const saveButton = Array.from(root().querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === 'Save',
    );
    saveButton?.click();

    expect(patches).toEqual([{ description: null }]);
  });

  it('should not save a description equal to the stored one', async () => {
    fixture.componentRef.setInput('intervention', { ...intervention, description: 'Existing' });
    await fixture.whenStable();

    // Opening through the trigger seeds the draft from the stored value.
    const trigger = byTestId('intervention-description-field') as HTMLElement;
    (trigger.querySelector('button') as HTMLButtonElement).click();
    fixture.componentRef.setInput('editState', { ...IDLE_EDIT_STATE, open: 'description' });
    await fixture.whenStable();

    const saveButton = Array.from(root().querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === 'Save',
    );

    expect(saveButton?.hasAttribute('disabled')).toBe(true);
  });

  it('should render every assignee as an avatar', async () => {
    fixture.componentRef.setInput('participants', [
      { label: 'JD', tooltip: 'Jane Doe' },
      { label: 'AB', tooltip: 'Alex Brown' },
    ]);
    await fixture.whenStable();

    expect(root().textContent).toContain('JD');
    expect(root().textContent).toContain('AB');
  });
});
