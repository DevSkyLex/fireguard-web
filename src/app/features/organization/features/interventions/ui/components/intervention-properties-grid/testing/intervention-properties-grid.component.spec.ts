import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type {
  InterventionEditState,
  InterventionOutput,
  MemberSelectOption,
  UpdateInterventionInput,
} from '@features/organization/features/interventions/models';
import { InterventionPropertiesGrid } from '../intervention-properties-grid.component';

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
  site: null,
  responsible: null,
  participants: ['/api/organizations/org-1/members/member-1'],
  labels: [],
  priority: 'normal',
  plannedStartAt: null,
  dueAt: null,
  reviewNote: null,
  revision: 3,
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

const members: readonly MemberSelectOption[] = [
  {
    value: '/api/organizations/org-1/members/member-1',
    label: 'Jane Doe',
    displayName: 'Jane Doe',
    initials: 'JD',
    avatarUrl: null,
    roleLabel: 'Technician',
  },
];

describe('InterventionPropertiesGrid', () => {
  let fixture: ComponentFixture<InterventionPropertiesGrid>;
  let patches: UpdateInterventionInput[];

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const byTestId = (id: string): HTMLElement | null =>
    root().querySelector(`[data-testid="${id}"]`);

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(InterventionPropertiesGrid);
    fixture.componentRef.setInput('intervention', intervention);
    fixture.componentRef.setInput('memberOptions', members);
    fixture.componentRef.setInput('editState', IDLE_EDIT_STATE);
    fixture.componentRef.setInput('canEditPlanning', true);
    fixture.componentRef.setInput('canEditDetails', true);
    await fixture.whenStable();

    patches = [];
    fixture.componentInstance.detailsChanged.subscribe((patch) => patches.push(patch));
  });

  it('should render one row per property', () => {
    expect(byTestId('intervention-field-priority')).not.toBeNull();
    expect(byTestId('intervention-field-site')).not.toBeNull();
    expect(byTestId('intervention-field-responsible')).not.toBeNull();
    expect(byTestId('intervention-field-schedule')).not.toBeNull();
    expect(byTestId('intervention-field-participants')).not.toBeNull();
    expect(byTestId('intervention-field-labels')).not.toBeNull();
  });

  it('should show the revision the whole optimistic-concurrency scheme is pinned to', () => {
    expect(byTestId('intervention-field-revision')?.textContent).toContain('v3');
  });

  it('should show who is unassigned without a face', () => {
    expect(byTestId('intervention-field-responsible')?.textContent).toContain('Unassigned');
  });

  it('should show the participant count from the resolved member options', () => {
    expect(byTestId('intervention-field-participants')?.textContent).not.toContain('None');
  });
});
