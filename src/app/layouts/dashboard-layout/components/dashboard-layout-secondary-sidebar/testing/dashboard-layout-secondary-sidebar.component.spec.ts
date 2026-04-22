import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DASHBOARD_SECONDARY_SIDEBAR_CONTRIBUTION } from '@core/ports/dashboard-secondary-sidebar';
import { DashboardLayoutSecondarySidebar } from '../dashboard-layout-secondary-sidebar.component';

@Component({
  selector: 'app-contribution-stub',
  template: '<div data-testid="contribution-content">Content</div>',
})
class ContributionStub {}

@Component({
  selector: 'app-contribution-high',
  template: '<div data-testid="high-priority-content">High</div>',
})
class HighPriorityContribution {}

@Component({
  selector: 'app-contribution-low',
  template: '<div data-testid="low-priority-content">Low</div>',
})
class LowPriorityContribution {}

describe('DashboardLayoutSecondarySidebar', () => {
  it('should create', () => {
    TestBed.configureTestingModule({
      imports: [DashboardLayoutSecondarySidebar],
    });

    const fixture = TestBed.createComponent(DashboardLayoutSecondarySidebar);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render nothing when there are no contributions', () => {
    TestBed.configureTestingModule({
      imports: [DashboardLayoutSecondarySidebar],
    });

    const fixture = TestBed.createComponent(DashboardLayoutSecondarySidebar);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('[data-testid="contribution-content"]'))).toBeFalsy();
  });

  it('should render the contribution component when isActive is true', () => {
    TestBed.configureTestingModule({
      imports: [DashboardLayoutSecondarySidebar],
      providers: [
        {
          provide: DASHBOARD_SECONDARY_SIDEBAR_CONTRIBUTION,
          useValue: { id: 'test', priority: 10, component: ContributionStub, isActive: signal(true) },
          multi: true,
        },
      ],
    });

    const fixture = TestBed.createComponent(DashboardLayoutSecondarySidebar);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('[data-testid="contribution-content"]'))).toBeTruthy();
  });

  it('should not render the contribution component when isActive is false', () => {
    TestBed.configureTestingModule({
      imports: [DashboardLayoutSecondarySidebar],
      providers: [
        {
          provide: DASHBOARD_SECONDARY_SIDEBAR_CONTRIBUTION,
          useValue: { id: 'test', priority: 10, component: ContributionStub, isActive: signal(false) },
          multi: true,
        },
      ],
    });

    const fixture = TestBed.createComponent(DashboardLayoutSecondarySidebar);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('[data-testid="contribution-content"]'))).toBeFalsy();
  });

  it('should pick the highest priority active contribution when multiple are registered', () => {
    TestBed.configureTestingModule({
      imports: [DashboardLayoutSecondarySidebar],
      providers: [
        {
          provide: DASHBOARD_SECONDARY_SIDEBAR_CONTRIBUTION,
          useValue: { id: 'low', priority: 5, component: LowPriorityContribution, isActive: signal(true) },
          multi: true,
        },
        {
          provide: DASHBOARD_SECONDARY_SIDEBAR_CONTRIBUTION,
          useValue: { id: 'high', priority: 20, component: HighPriorityContribution, isActive: signal(true) },
          multi: true,
        },
      ],
    });

    const fixture = TestBed.createComponent(DashboardLayoutSecondarySidebar);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('[data-testid="high-priority-content"]'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('[data-testid="low-priority-content"]'))).toBeFalsy();
  });

  it('should expose the activeComponent signal', () => {
    TestBed.configureTestingModule({
      imports: [DashboardLayoutSecondarySidebar],
      providers: [
        {
          provide: DASHBOARD_SECONDARY_SIDEBAR_CONTRIBUTION,
          useValue: { id: 'test', priority: 10, component: ContributionStub, isActive: signal(true) },
          multi: true,
        },
      ],
    });

    const fixture = TestBed.createComponent(DashboardLayoutSecondarySidebar);

    expect(fixture.componentInstance.activeComponent()).toBe(ContributionStub);
  });

  it('should return null from activeComponent when no contribution is active', () => {
    TestBed.configureTestingModule({
      imports: [DashboardLayoutSecondarySidebar],
    });

    const fixture = TestBed.createComponent(DashboardLayoutSecondarySidebar);

    expect(fixture.componentInstance.activeComponent()).toBeNull();
  });
});
