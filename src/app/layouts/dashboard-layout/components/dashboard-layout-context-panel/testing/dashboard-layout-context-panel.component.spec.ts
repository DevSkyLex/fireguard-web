import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { CONTEXT_PANEL_SLOT } from '@layouts/dashboard-layout/slots/context-panel';
import { DashboardLayoutContextPanel } from '../dashboard-layout-context-panel.component';

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

describe('DashboardLayoutContextPanel', () => {
  it('should create', () => {
    TestBed.configureTestingModule({
      imports: [DashboardLayoutContextPanel],
    });

    const fixture = TestBed.createComponent(DashboardLayoutContextPanel);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render nothing when there are no contributions', () => {
    TestBed.configureTestingModule({
      imports: [DashboardLayoutContextPanel],
    });

    const fixture = TestBed.createComponent(DashboardLayoutContextPanel);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('[data-testid="contribution-content"]'))).toBeFalsy();
  });

  it('should render the contribution component when active is true', () => {
    TestBed.configureTestingModule({
      imports: [DashboardLayoutContextPanel],
      providers: [
        {
          provide: CONTEXT_PANEL_SLOT,
          useValue: { id: 'test', priority: 10, component: ContributionStub, active: signal(true) },
          multi: true,
        },
      ],
    });

    const fixture = TestBed.createComponent(DashboardLayoutContextPanel);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('[data-testid="contribution-content"]'))).toBeTruthy();
  });

  it('should not render the contribution component when active is false', () => {
    TestBed.configureTestingModule({
      imports: [DashboardLayoutContextPanel],
      providers: [
        {
          provide: CONTEXT_PANEL_SLOT,
          useValue: { id: 'test', priority: 10, component: ContributionStub, active: signal(false) },
          multi: true,
        },
      ],
    });

    const fixture = TestBed.createComponent(DashboardLayoutContextPanel);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('[data-testid="contribution-content"]'))).toBeFalsy();
  });

  it('should pick the highest priority active contribution when multiple are registered', () => {
    TestBed.configureTestingModule({
      imports: [DashboardLayoutContextPanel],
      providers: [
        {
          provide: CONTEXT_PANEL_SLOT,
          useValue: { id: 'low', priority: 5, component: LowPriorityContribution, active: signal(true) },
          multi: true,
        },
        {
          provide: CONTEXT_PANEL_SLOT,
          useValue: { id: 'high', priority: 20, component: HighPriorityContribution, active: signal(true) },
          multi: true,
        },
      ],
    });

    const fixture = TestBed.createComponent(DashboardLayoutContextPanel);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('[data-testid="high-priority-content"]'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('[data-testid="low-priority-content"]'))).toBeFalsy();
  });

  it('should expose the activeComponent signal', () => {
    TestBed.configureTestingModule({
      imports: [DashboardLayoutContextPanel],
      providers: [
        {
          provide: CONTEXT_PANEL_SLOT,
          useValue: { id: 'test', priority: 10, component: ContributionStub, active: signal(true) },
          multi: true,
        },
      ],
    });

    const fixture = TestBed.createComponent(DashboardLayoutContextPanel);

    expect(fixture.componentInstance.activeComponent()).toBe(ContributionStub);
  });

  it('should return null from activeComponent when no contribution is active', () => {
    TestBed.configureTestingModule({
      imports: [DashboardLayoutContextPanel],
    });

    const fixture = TestBed.createComponent(DashboardLayoutContextPanel);

    expect(fixture.componentInstance.activeComponent()).toBeNull();
  });
});
