import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type {
  InterventionEditState,
  InterventionEditTarget,
  InterventionOutput,
  MemberSelectOption,
  SelectOption,
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
  hasSignature: false,
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
  let editTargets: (InterventionEditTarget | null)[];

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const byTestId = (id: string): HTMLElement | null =>
    root().querySelector(`[data-testid="${id}"]`);

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    });

    fixture = TestBed.createComponent(InterventionPropertiesGrid);
    fixture.componentRef.setInput('intervention', intervention);
    fixture.componentRef.setInput('organizationId', 'org-1');
    fixture.componentRef.setInput('memberOptions', members);
    fixture.componentRef.setInput('editState', IDLE_EDIT_STATE);
    fixture.componentRef.setInput('canEditSchedule', true);
    fixture.componentRef.setInput('canEditSite', true);
    fixture.componentRef.setInput('canEditResponsible', true);
    fixture.componentRef.setInput('canEditDetails', true);
    await fixture.whenStable();

    patches = [];
    editTargets = [];
    fixture.componentInstance.detailsChanged.subscribe((patch) => patches.push(patch));
    fixture.componentInstance.editTargetChanged.subscribe((target) => editTargets.push(target));
  });

  it('should render one row per property', () => {
    expect(byTestId('intervention-field-reference')?.textContent).toContain('FG-5');
    expect(byTestId('intervention-field-type')).not.toBeNull();
    expect(byTestId('intervention-field-updated')).not.toBeNull();
    expect(byTestId('intervention-property-status')?.textContent).toContain('Draft');
    expect(
      byTestId('intervention-field-priority')?.querySelector('[data-slot="badge"]'),
    ).not.toBeNull();
    expect(byTestId('intervention-field-priority')).not.toBeNull();
    expect(byTestId('intervention-field-site')).not.toBeNull();
    expect(byTestId('intervention-field-responsible')).not.toBeNull();
    expect(byTestId('intervention-field-schedule')).not.toBeNull();
    expect(byTestId('intervention-field-participants')).not.toBeNull();
    expect(byTestId('intervention-field-labels')).not.toBeNull();
    expect(byTestId('intervention-description-field')).not.toBeNull();
  });

  it('should hide secondary properties behind a Spartan disclosure by default', async () => {
    const trigger = byTestId('intervention-properties-details-trigger') as HTMLButtonElement;
    const content = byTestId('intervention-properties-details-content');

    expect(trigger).not.toBeNull();
    expect(byTestId('intervention-properties-details-collapse-trigger')).toBeNull();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(content?.getAttribute('data-state')).toBe('closed');

    trigger.click();
    await fixture.whenStable();

    expect(byTestId('intervention-properties-details-trigger')).toBeNull();
    const collapseTrigger = byTestId(
      'intervention-properties-details-collapse-trigger',
    ) as HTMLButtonElement;
    expect(collapseTrigger).not.toBeNull();
    expect(collapseTrigger.getAttribute('aria-expanded')).toBe('true');
    expect(content?.getAttribute('data-state')).toBe('open');

    collapseTrigger.click();
    await fixture.whenStable();

    expect(byTestId('intervention-properties-details-collapse-trigger')).toBeNull();
    expect(byTestId('intervention-properties-details-trigger')).not.toBeNull();
    expect(content?.getAttribute('data-state')).toBe('closed');
  });

  it('should reset the disclosure when the displayed intervention changes', async () => {
    const trigger = byTestId('intervention-properties-details-trigger') as HTMLButtonElement;

    trigger.click();
    await fixture.whenStable();
    expect(byTestId('intervention-properties-details-trigger')).toBeNull();
    expect(byTestId('intervention-properties-details-collapse-trigger')).not.toBeNull();

    fixture.componentRef.setInput('intervention', { ...intervention, id: 'intervention-2' });
    await fixture.whenStable();

    expect(byTestId('intervention-properties-details-trigger')).not.toBeNull();
    expect(byTestId('intervention-properties-details-trigger')?.getAttribute('aria-expanded')).toBe(
      'false',
    );
    expect(byTestId('intervention-properties-details-collapse-trigger')).toBeNull();
  });

  it('should order identity, action context, planning and secondary metadata', () => {
    const expected = [
      'intervention-field-reference',
      'intervention-field-type',
      'intervention-property-status',
      'intervention-field-priority',
      'intervention-field-site',
      'intervention-field-responsible',
      'intervention-field-schedule',
      'intervention-field-participants',
      'intervention-field-labels',
      'intervention-description-field',
      'intervention-field-revision',
      'intervention-field-updated',
    ];
    const propertyIds = new Set(expected);
    const actual = Array.from(root().querySelectorAll<HTMLElement>('[data-testid]'))
      .map((element) => element.dataset['testid'])
      .filter((id): id is string => id !== undefined && propertyIds.has(id));

    expect(actual).toEqual(expected);
  });

  it('should not render the removed activity metadata inside the properties surface', () => {
    expect(byTestId('intervention-detail-meta')).toBeNull();
  });

  it('should use the table missing-value marker for unset properties', async () => {
    fixture.componentRef.setInput('intervention', { ...intervention, participants: [] });
    await fixture.whenStable();

    const missingPropertyIds = [
      'intervention-field-site',
      'intervention-field-responsible',
      'intervention-field-schedule',
      'intervention-field-participants',
      'intervention-field-labels',
      'intervention-description-field',
    ];

    for (const id of missingPropertyIds) {
      expect(byTestId(id)?.querySelector('[fieldvalue]')?.textContent?.trim()).toBe('—');
    }
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

    const trigger = byTestId('intervention-description-field') as HTMLElement;
    (trigger.querySelector('button') as HTMLButtonElement).click();
    fixture.componentRef.setInput('editState', { ...IDLE_EDIT_STATE, open: 'description' });
    await fixture.whenStable();

    const saveButton = Array.from(root().querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === 'Save',
    );

    expect(saveButton?.hasAttribute('disabled')).toBe(true);
  });

  it('should show the revision the whole optimistic-concurrency scheme is pinned to', () => {
    expect(byTestId('intervention-field-revision')?.textContent).toContain('v3');
  });

  it('should show the participant count from the resolved member options', () => {
    expect(byTestId('intervention-field-participants')?.textContent).not.toContain('None');
  });

  it('should keep an editable site inside the in-place field without a nested link', async () => {
    const siteOptions: readonly SelectOption[] = [
      { value: '/api/facilities/facility-1', label: 'Main warehouse' },
    ];
    fixture.componentRef.setInput('intervention', {
      ...intervention,
      site: '/api/facilities/facility-1',
    });
    fixture.componentRef.setInput('siteOptions', siteOptions);
    await fixture.whenStable();

    const inplaceField: HTMLElement = byTestId('intervention-field-site')?.querySelector(
      'app-inplace-field',
    ) as HTMLElement;

    expect(inplaceField.textContent).toContain('Main warehouse');
    expect(inplaceField.querySelector('a')).toBeNull();
  });

  it('should make the site name the facility link once the field is read-only', async () => {
    const siteOptions: readonly SelectOption[] = [
      { value: '/api/facilities/facility-1', label: 'Main warehouse' },
    ];
    fixture.componentRef.setInput('intervention', {
      ...intervention,
      site: '/api/facilities/facility-1',
    });
    fixture.componentRef.setInput('siteOptions', siteOptions);
    fixture.componentRef.setInput('canEditSite', false);
    await fixture.whenStable();

    const link: HTMLAnchorElement | null = byTestId('intervention-site-link') as HTMLAnchorElement;

    expect(link).not.toBeNull();
    expect(link.getAttribute('href')).toBe('/organizations/org-1/facilities/facility-1');
    expect(link.textContent?.trim()).toBe('Main warehouse');
  });

  it('should hide the external-link anchor when no site is set', () => {
    expect(byTestId('intervention-site-link')).toBeNull();
  });

  it('should emit the planned window re-anchored at midnight UTC of the picked days', () => {
    const grid = fixture.componentInstance as unknown as {
      pickSchedule(range: [Date, Date] | null): void;
    };

    grid.pickSchedule([new Date(2026, 8, 2), new Date(2026, 8, 4)]);

    expect(patches).toEqual([
      {
        plannedStartAt: new Date('2026-09-02T00:00:00.000Z'),
        dueAt: new Date('2026-09-04T00:00:00.000Z'),
      },
    ]);
  });

  it('should render every row when the wire payload omits its null fields entirely', async () => {
    const {
      description: _description,
      site: _site,
      responsible: _responsible,
      plannedStartAt: _plannedStartAt,
      dueAt: _dueAt,
      reviewNote: _reviewNote,
      ...wirePayload
    } = intervention;
    fixture.componentRef.setInput('intervention', wirePayload);
    await fixture.whenStable();

    expect(byTestId('intervention-field-priority')).not.toBeNull();
    expect(byTestId('intervention-field-site')).not.toBeNull();
    expect(byTestId('intervention-field-responsible')).not.toBeNull();
    expect(byTestId('intervention-field-schedule')).not.toBeNull();
    expect(byTestId('intervention-site-link')).toBeNull();
  });
});
