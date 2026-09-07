import { PLATFORM_ID, provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { OrganizationDashboardRisk } from '../organization-dashboard-risk.component';

describe('OrganizationDashboardRisk', () => {
  let fixture: ComponentFixture<OrganizationDashboardRisk>;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), { provide: PLATFORM_ID, useValue: 'server' }],
    });
    fixture = TestBed.createComponent(OrganizationDashboardRisk);
  });
  afterEach(() => TestBed.resetTestingModule());
  it('never treats missing status counts as a healthy zero', async () => {
    fixture.componentRef.setInput('overview', {
      nonConformities: { summary: [{ key: 'open', value: 0 }] },
    });
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Status breakdown unavailable');
    expect(fixture.nativeElement.textContent).not.toContain('No non-conformities recorded');
  });
  it('shows the four real values and proportions against their common total', async () => {
    fixture.componentRef.setInput('overview', {
      nonConformities: {
        summary: [
          { key: 'open', value: 5 },
          { key: 'inProgress', value: 3 },
          { key: 'done', value: 10 },
          { key: 'waived', value: 2 },
        ],
      },
    });
    await fixture.whenStable();
    const rows = fixture.nativeElement.querySelectorAll('dl > div');
    expect(rows).toHaveLength(4);
    expect(rows[0].textContent).toContain('25%');
    expect(rows[1].textContent).toContain('15%');
    expect(rows[2].textContent).toContain('50%');
    expect(rows[3].textContent).toContain('10%');
  });
  it('reports a genuine empty state only when all four counts are zero', async () => {
    fixture.componentRef.setInput('overview', {
      nonConformities: {
        summary: ['open', 'inProgress', 'done', 'waived'].map((key) => ({ key, value: 0 })),
      },
    });
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('No non-conformities recorded');
  });
});
