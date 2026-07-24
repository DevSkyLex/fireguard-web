import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { FacilityOverviewStore } from '@features/organization/features/facilities/state';
import type { InspectionOutput } from '@features/organization/features/inspections/models';
import { FacilityInspectionsOverview } from '../facility-inspections-overview.component';

function buildInspection(overrides: Partial<InspectionOutput>): InspectionOutput {
  return {
    '@id': '/api/inspections/insp-1',
    '@type': 'Inspection',
    id: 'insp-1',
    organizationId: 'org-1',
    equipmentId: 'eq-1',
    facilityId: 'fac-1',
    result: 'pass',
    status: 'closed',
    performedAt: '2025-01-01T00:00:00Z',
    inspector: {
      type: 'user',
      id: 'user-1',
      firstName: 'Jane',
      lastName: 'Doe',
      displayName: 'Jane Doe',
      avatarUrl: null,
      organizationName: null,
    },
    checklistId: null,
    notes: null,
    signature: null,
    nonConformitiesCount: 0,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    ...overrides,
  } as InspectionOutput;
}

describe('FacilityInspectionsOverview', () => {
  const mockOverviewStore = {
    isLoadingInspections: signal<boolean>(false),
    inspections: signal<ReadonlyArray<InspectionOutput>>([]),
  };

  beforeEach(() => {
    mockOverviewStore.isLoadingInspections.set(false);
    mockOverviewStore.inspections.set([]);

    TestBed.configureTestingModule({
      imports: [FacilityInspectionsOverview],
      providers: [{ provide: FacilityOverviewStore, useValue: mockOverviewStore }],
    });
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(FacilityInspectionsOverview);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should show skeletons while loading', () => {
    mockOverviewStore.isLoadingInspections.set(true);
    const fixture = TestBed.createComponent(FacilityInspectionsOverview);
    fixture.detectChanges();

    const skeletons = fixture.debugElement.queryAll(By.css('p-skeleton'));
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should show an empty state when there are no inspections', () => {
    mockOverviewStore.inspections.set([]);
    const fixture = TestBed.createComponent(FacilityInspectionsOverview);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No inspection matches this filter');
  });

  it('should render inspection rows sorted by performed date, capped to the preview limit', () => {
    const inspections: InspectionOutput[] = Array.from({ length: 8 }, (_, index) =>
      buildInspection({
        id: `insp-${index}`,
        performedAt: new Date(2025, 0, 8 - index).toISOString(),
        inspector: {
          type: 'user',
          id: `user-${index}`,
          firstName: 'Jane',
          lastName: `Doe ${index}`,
          displayName: `Jane Doe ${index}`,
          avatarUrl: null,
          organizationName: null,
        },
      }),
    );
    mockOverviewStore.inspections.set(inspections);

    const fixture = TestBed.createComponent(FacilityInspectionsOverview);
    fixture.detectChanges();

    const articles = fixture.debugElement.queryAll(By.css('article'));
    expect(articles.length).toBe(6);
    // Ascending by performedAt: the earliest date (index 7) renders first.
    expect(articles[0].nativeElement.textContent).toContain('Jane Doe 7');
  });

  it('should filter to overdue inspections when the overdue pill is selected', () => {
    const past: InspectionOutput = buildInspection({
      id: 'insp-past',
      status: 'submitted',
      performedAt: new Date(Date.now() - 86_400_000).toISOString(),
      inspector: {
        type: 'user',
        id: 'user-past',
        firstName: 'Past',
        lastName: 'Inspector',
        displayName: 'Past Inspector',
        avatarUrl: null,
        organizationName: null,
      },
    });
    const future: InspectionOutput = buildInspection({
      id: 'insp-future',
      status: 'draft',
      performedAt: new Date(Date.now() + 86_400_000).toISOString(),
      inspector: {
        type: 'user',
        id: 'user-future',
        firstName: 'Future',
        lastName: 'Inspector',
        displayName: 'Future Inspector',
        avatarUrl: null,
        organizationName: null,
      },
    });
    mockOverviewStore.inspections.set([past, future]);

    const fixture = TestBed.createComponent(FacilityInspectionsOverview);
    fixture.detectChanges();

    const buttons = fixture.debugElement.queryAll(By.css('button'));
    const overdueButton = buttons.find((debugElement) =>
      (debugElement.nativeElement.textContent as string).includes('Overdue'),
    );
    expect(overdueButton).toBeTruthy();
    overdueButton?.nativeElement.click();
    fixture.detectChanges();

    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('Past Inspector');
    expect(text).not.toContain('Future Inspector');
  });

  it('should filter to upcoming inspections when the upcoming pill is selected', () => {
    const past: InspectionOutput = buildInspection({
      id: 'insp-past',
      status: 'submitted',
      performedAt: new Date(Date.now() - 86_400_000).toISOString(),
      inspector: {
        type: 'user',
        id: 'user-past',
        firstName: 'Past',
        lastName: 'Inspector',
        displayName: 'Past Inspector',
        avatarUrl: null,
        organizationName: null,
      },
    });
    const future: InspectionOutput = buildInspection({
      id: 'insp-future',
      status: 'draft',
      performedAt: new Date(Date.now() + 86_400_000).toISOString(),
      inspector: {
        type: 'user',
        id: 'user-future',
        firstName: 'Future',
        lastName: 'Inspector',
        displayName: 'Future Inspector',
        avatarUrl: null,
        organizationName: null,
      },
    });
    mockOverviewStore.inspections.set([past, future]);

    const fixture = TestBed.createComponent(FacilityInspectionsOverview);
    fixture.detectChanges();

    const buttons = fixture.debugElement.queryAll(By.css('button'));
    const upcomingButton = buttons.find((debugElement) =>
      (debugElement.nativeElement.textContent as string).includes('Upcoming'),
    );
    expect(upcomingButton).toBeTruthy();
    upcomingButton?.nativeElement.click();
    fixture.detectChanges();

    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('Future Inspector');
    expect(text).not.toContain('Past Inspector');
  });

  it('should fall back to the unknown inspector label when the inspector is null', () => {
    mockOverviewStore.inspections.set([buildInspection({ id: 'insp-1', inspector: null })]);
    const fixture = TestBed.createComponent(FacilityInspectionsOverview);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Unknown inspector');
  });

  it('should display the pass/fail/partial result label for each inspection', () => {
    mockOverviewStore.inspections.set([buildInspection({ id: 'insp-1', result: 'fail' })]);
    const fixture = TestBed.createComponent(FacilityInspectionsOverview);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Fail');
  });
});
