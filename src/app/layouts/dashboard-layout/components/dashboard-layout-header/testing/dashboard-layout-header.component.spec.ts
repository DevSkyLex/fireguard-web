import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { BreadcrumbService } from '@core/breadcrumb';
import {
  DashboardHeaderActionsService,
  DashboardSidebarNavigationService,
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
        DashboardSidebarNavigationService,
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
    const menuButton = fixture.debugElement.query(
      By.css('button[aria-label="Open navigation menu"]'),
    );
    (menuButton.nativeElement as HTMLButtonElement).click();

    expect(openSpy).toHaveBeenCalledTimes(1);
  });

  it('should render breadcrumb navigation', () => {
    const fixture = TestBed.createComponent(DashboardLayoutHeader);

    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('app-dashboard-layout-breadcrumb'))).toBeTruthy();
  });

  it('should render the search trigger then the topbar slot actions in order', () => {
    mockHeaderActionsService.actions = [
      { id: 'theme-switcher', order: 10, component: TestHeaderActionA },
      { id: 'notification-bell', order: 20, component: TestHeaderActionB },
    ];
    const fixture = TestBed.createComponent(DashboardLayoutHeader);

    fixture.detectChanges();

    const buttons = fixture.debugElement.queryAll(By.css('section:last-of-type button'));
    const labels = buttons.map((button) => button.nativeElement.textContent.trim());

    expect(buttons[0].attributes['data-testid']).toBe('header-search-trigger');
    expect(labels.slice(1)).toEqual(['Action A', 'Action B']);
  });
});
