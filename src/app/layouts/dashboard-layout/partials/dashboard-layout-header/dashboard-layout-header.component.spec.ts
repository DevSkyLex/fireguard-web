import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { OrganizationStore } from '@core/stores/organization';
import { DashboardBreadcrumbService, DashboardSidebarService } from '@layouts/dashboard-layout/services';
import { DashboardLayoutHeader } from './dashboard-layout-header.component';

describe('DashboardLayoutHeader', () => {
  const mockOrganizationStore = {
    selectedOrganization: signal(null),
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [DashboardLayoutHeader],
      providers: [
        DashboardSidebarService,
        DashboardBreadcrumbService,
        provideRouter([]),
        { provide: OrganizationStore, useValue: mockOrganizationStore },
      ],
    });
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(DashboardLayoutHeader);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should open sidebar when menu button is clicked', () => {
    const fixture = TestBed.createComponent(DashboardLayoutHeader);
    const sidebarService = TestBed.inject(DashboardSidebarService);
    const openSpy = vi.spyOn(sidebarService, 'open');

    fixture.detectChanges();
    const menuButton = fixture.debugElement.query(By.css('p-button'));
    menuButton.triggerEventHandler('onClick', new MouseEvent('click'));

    expect(openSpy).toHaveBeenCalledTimes(1);
  });

  it('should render breadcrumb navigation', () => {
    const fixture = TestBed.createComponent(DashboardLayoutHeader);

    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('app-dashboard-layout-breadcrumb'))).toBeTruthy();
  });
});
