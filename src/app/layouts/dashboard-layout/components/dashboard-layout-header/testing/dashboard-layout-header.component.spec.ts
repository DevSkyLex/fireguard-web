import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { BreadcrumbService } from '@core/breadcrumb';
import {
  DashboardHeaderActionsService,
  DashboardSidebarService,
} from '@layouts/dashboard-layout/services';
import type { TopbarContribution } from '@layouts/dashboard-layout/slots/topbar';
import { DashboardLayoutHeader } from '../dashboard-layout-header.component';

@Component({
  selector: 'app-test-header-action-a',
  standalone: true,
  template: '<button type="button">Action A</button>',
})
class TestHeaderActionA {}

@Component({
  selector: 'app-test-header-action-b',
  standalone: true,
  template: '<button type="button">Action B</button>',
})
class TestHeaderActionB {}

describe('DashboardLayoutHeader', () => {
  const mockHeaderActionsService: {
    actions: TopbarContribution[];
  } = {
    actions: [],
  };

  beforeEach(() => {
    mockHeaderActionsService.actions = [];

    TestBed.configureTestingModule({
      imports: [DashboardLayoutHeader],
      providers: [
        DashboardSidebarService,
        BreadcrumbService,
        provideRouter([]),
        { provide: DashboardHeaderActionsService, useValue: mockHeaderActionsService },
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

  it('should render a vertical divider before the user menu action', () => {
    mockHeaderActionsService.actions = [
      { id: 'notification-bell', order: 20, component: TestHeaderActionA },
      { id: 'user-menu', order: 30, component: TestHeaderActionB },
    ];
    const fixture = TestBed.createComponent(DashboardLayoutHeader);

    fixture.detectChanges();

    expect(fixture.debugElement.queryAll(By.css('p-divider[layout="vertical"]'))).toHaveLength(1);
  });
});
