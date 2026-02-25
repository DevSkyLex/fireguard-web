import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { OrganizationStore } from '@core/stores/organization';
import { DashboardBreadcrumbService } from '@layouts/dashboard-layout/services';
import { DashboardLayoutBreadcrumb } from './dashboard-layout-breadcrumb.component';

describe('DashboardLayoutBreadcrumb', () => {
  const mockOrganizationStore = {
    selectedOrganization: signal(null),
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [DashboardLayoutBreadcrumb],
      providers: [
        DashboardBreadcrumbService,
        provideRouter([]),
        { provide: OrganizationStore, useValue: mockOrganizationStore },
      ],
    });
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(DashboardLayoutBreadcrumb);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render breadcrumb navigation', () => {
    const fixture = TestBed.createComponent(DashboardLayoutBreadcrumb);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('p-breadcrumb'))).toBeTruthy();
  });
});
