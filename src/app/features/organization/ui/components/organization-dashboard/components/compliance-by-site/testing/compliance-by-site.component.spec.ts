import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { ComplianceFacilityRow } from '@features/organization/features/compliance/models';
import { ComplianceBySite } from '../compliance-by-site.component';

const row = (overrides: Partial<ComplianceFacilityRow> = {}): ComplianceFacilityRow => ({
  facilityId: 'f-1',
  name: 'Site',
  type: 'building',
  parentFacilityId: null,
  path: 'Site',
  status: 'active',
  totalEquipmentCount: 12,
  activeEquipmentCount: 12,
  upToDateEquipmentCount: 6,
  dueSoonEquipmentCount: 3,
  overdueEquipmentCount: 3,
  unscheduledEquipmentCount: 0,
  trackedEquipmentCount: 12,
  complianceRate: 50,
  openLowNonConformityCount: 0,
  openMediumNonConformityCount: 0,
  openHighNonConformityCount: 0,
  openCriticalNonConformityCount: 0,
  lastInspectionAt: null,
  ...overrides,
});

const meterLabels = (fixture: ComponentFixture<ComplianceBySite>): (string | null)[] =>
  Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('[role="meter"]')).map(
    (meter: Element): string | null => meter.getAttribute('aria-label'),
  );

describe('ComplianceBySite', () => {
  const createComponent = (
    rows: readonly ComplianceFacilityRow[],
    { loading = false, hasError = false }: { loading?: boolean; hasError?: boolean } = {},
  ): ComponentFixture<ComplianceBySite> => {
    TestBed.configureTestingModule({ imports: [ComplianceBySite] });

    const fixture: ComponentFixture<ComplianceBySite> = TestBed.createComponent(ComplianceBySite);
    fixture.componentRef.setInput('rows', rows);
    fixture.componentRef.setInput('loading', loading);
    fixture.componentRef.setInput('hasError', hasError);
    fixture.detectChanges();

    return fixture;
  };

  it('should list the five worst measured sites, worst coverage first', () => {
    const fixture = createComponent([
      row({ facilityId: 'f-90', path: 'Site 90', complianceRate: 90 }),
      row({ facilityId: 'f-10', path: 'Site 10', complianceRate: 10 }),
      row({ facilityId: 'f-50', path: 'Site 50', complianceRate: 50 }),
      row({ facilityId: 'f-30', path: 'Site 30', complianceRate: 30 }),
      row({ facilityId: 'f-70', path: 'Site 70', complianceRate: 70 }),
      row({ facilityId: 'f-20', path: 'Site 20', complianceRate: 20 }),
      row({ facilityId: 'f-40', path: 'Site 40', complianceRate: 40 }),
    ]);

    expect(meterLabels(fixture)).toEqual(['Site 10', 'Site 20', 'Site 30', 'Site 40', 'Site 50']);
  });

  // The register invariant: a null rate is "unmeasured", never 0%. Sorting it
  // into the bars would report an unscheduled site as fully non-compliant.
  it('should exclude unmeasured sites from the bars and count them instead', () => {
    const fixture = createComponent([
      row({ facilityId: 'f-1', path: 'Measured', complianceRate: 80 }),
      row({ facilityId: 'f-2', path: 'Untracked A', complianceRate: null }),
      row({ facilityId: 'f-3', path: 'Untracked B', complianceRate: null }),
    ]);

    expect(meterLabels(fixture)).toEqual(['Measured']);
    expect(fixture.nativeElement.textContent).toContain('2 sites not yet measured');
  });

  it('should word a single unmeasured site in the singular', () => {
    const fixture = createComponent([
      row({ facilityId: 'f-1', path: 'Measured', complianceRate: 80 }),
      row({ facilityId: 'f-2', path: 'Untracked', complianceRate: null }),
    ]);

    expect(fixture.nativeElement.textContent).toContain('1 site not yet measured');
  });

  it('should omit the unmeasured line when every site is measured', () => {
    const fixture = createComponent([row({ complianceRate: 80 })]);

    expect(fixture.nativeElement.textContent).not.toContain('not yet measured');
  });

  it('should render an em dash — never 0% — for a null rate', () => {
    const fixture = createComponent([row({ complianceRate: 41.7 })]);
    const harness = fixture.componentInstance as unknown as {
      rateLabel(rate: number | null): string;
    };

    expect(harness.rateLabel(null)).toBe('—');
    expect(fixture.nativeElement.textContent).toContain('42%');
  });

  // A 100% built on two assets must not read as a clean estate: the
  // denominator stays visible per row, as the name column's sub-line.
  it('should show the tracked-equipment denominator under each site name', () => {
    const fixture = createComponent([
      row({ facilityId: 'f-1', path: 'Small', complianceRate: 100, trackedEquipmentCount: 2 }),
      row({ facilityId: 'f-2', path: 'Large', complianceRate: 40, trackedEquipmentCount: 128 }),
    ]);
    const text: string = fixture.nativeElement.textContent ?? '';

    expect(text).toContain('2 tracked');
    expect(text).toContain('128 tracked');
  });

  it('should size each bar by its coverage rate', () => {
    const fixture = createComponent([
      row({ facilityId: 'f-1', path: 'Site 25', complianceRate: 25 }),
      row({ facilityId: 'f-2', path: 'Site 75', complianceRate: 75 }),
    ]);
    const widths: string[] = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('[role="meter"] > div'),
    ).map((bar: HTMLElement): string => bar.style.width);

    expect(widths).toEqual(['25%', '75%']);
  });

  it('should render the empty state when there is no site at all', () => {
    const fixture = createComponent([]);

    expect(fixture.nativeElement.querySelector('app-empty-state')).toBeTruthy();
    expect(meterLabels(fixture)).toEqual([]);
  });

  it('should render skeletons while loading', () => {
    const fixture = createComponent([], { loading: true });

    expect(fixture.nativeElement.querySelector('app-skeleton')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('app-empty-state')).toBeNull();
  });

  it('should render a retryable error state on failure', () => {
    const fixture = createComponent([], { hasError: true });
    let retried = false;
    fixture.componentInstance.retry.subscribe(() => {
      retried = true;
    });

    const retryButton: HTMLButtonElement | null =
      fixture.nativeElement.querySelector('app-error-state button');
    expect(retryButton).toBeTruthy();

    retryButton?.click();
    expect(retried).toBe(true);
  });

  it('should emit viewCompliance from the header action', () => {
    const fixture = createComponent([row()]);
    let opened = false;
    fixture.componentInstance.viewCompliance.subscribe(() => {
      opened = true;
    });

    const actionButton: HTMLButtonElement | null = fixture.nativeElement.querySelector('button');
    expect(actionButton).toBeTruthy();

    actionButton?.click();
    expect(opened).toBe(true);
  });
});
