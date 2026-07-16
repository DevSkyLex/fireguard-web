import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { SIDEBAR_SLOT } from '@layouts/dashboard-layout/slots/sidebar';
import { DashboardLayoutHeader, DashboardLayoutSidebar } from '../components';
import { DashboardLayout } from '../dashboard-layout.component';
import { DashboardSidebarService } from '../services';

@Component({ template: '<div data-testid="sidebar-widget-stub"></div>' })
class SidebarWidgetStub {}

describe('DashboardLayout', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [DashboardLayout],
      providers: [
        provideRouter([]),
        {
          provide: SIDEBAR_SLOT,
          useValue: { id: 'stub', order: 10, region: 'lead', component: SidebarWidgetStub },
          multi: true,
        },
      ],
    }).overrideComponent(DashboardLayoutHeader, {
      set: {
        imports: [],
        template: '<div data-testid="dashboard-layout-header-stub"></div>',
      },
    });
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(DashboardLayout);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render a single primary sidebar', () => {
    const fixture = TestBed.createComponent(DashboardLayout);
    fixture.detectChanges();

    const sidebars = fixture.debugElement.queryAll(By.directive(DashboardLayoutSidebar));
    const primary = sidebars.filter((sidebar) => sidebar.componentInstance.variant() === 'primary');

    expect(primary).toHaveLength(1);
    expect(fixture.debugElement.query(By.css('app-dashboard-layout-context-panel'))).toBeFalsy();
  });

  it('should render the header and the content plane', () => {
    const fixture = TestBed.createComponent(DashboardLayout);
    fixture.detectChanges();

    expect(
      fixture.debugElement.query(By.css('[data-testid="dashboard-layout-header-stub"]')),
    ).toBeTruthy();
    expect(fixture.debugElement.query(By.css('app-dashboard-layout-content'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('router-outlet'))).toBeTruthy();
  });

  it('should render the icon-only rail width below the desktop breakpoint', () => {
    const fixture = TestBed.createComponent(DashboardLayout);
    fixture.detectChanges();

    // jsdom reports no matching media query, so the layout stays in rail mode.
    const aside = fixture.debugElement.query(By.css('aside')).nativeElement as HTMLElement;
    expect(aside.style.width).toBe('64px');
  });

  it('should open the mobile drawer through the sidebar service', () => {
    const fixture = TestBed.createComponent(DashboardLayout);
    const sidebarService = fixture.debugElement.injector.get(DashboardSidebarService);
    fixture.detectChanges();

    expect(sidebarService.visible()).toBe(false);

    sidebarService.open();
    fixture.detectChanges();

    expect(sidebarService.visible()).toBe(true);
    expect(fixture.debugElement.query(By.css('p-drawer'))).toBeTruthy();
  });
});
