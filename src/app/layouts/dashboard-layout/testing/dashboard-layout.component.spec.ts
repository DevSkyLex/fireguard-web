import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { SIDEBAR_SLOT } from '@layouts/dashboard-layout/slots/sidebar';
import { DashboardLayoutHeader, DashboardLayoutSidebar } from '../components';
import { SHELL_SIDEBAR_WIDTH_PX } from '../constants';
import { DashboardLayout } from '../dashboard-layout.component';
import { provideDashboardLayoutSlots } from '../providers';
import { DashboardSidebarService } from '../services';

@Component({ template: '<div data-testid="sidebar-widget-stub"></div>' })
class SidebarWidgetStub {}

describe('DashboardLayout', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [DashboardLayout],
      providers: [
        provideRouter([]),
        // The shell requires its slot wiring: `DashboardPanelService` and
        // `SHELL_PANEL_PORT` are bound by this provider, not by the component,
        // so a routed page injecting the port resolves the same instance.
        provideDashboardLayoutSlots({}),
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

  // jsdom reports no matching media query, so the shell renders its narrow
  // branch: rail and sidebar live in the drawer, nothing inline.
  it('should keep the rail and sidebar in the drawer below the tablet breakpoint', () => {
    const fixture = TestBed.createComponent(DashboardLayout);
    const sidebarService = fixture.debugElement.injector.get(DashboardSidebarService);
    fixture.detectChanges();

    // Nothing inline: the shell is in its narrow branch.
    expect(fixture.debugElement.queryAll(By.directive(DashboardLayoutSidebar))).toHaveLength(0);
    expect(fixture.debugElement.queryAll(By.css('app-dashboard-layout-org-rail'))).toHaveLength(0);

    // A drawer only renders its content once opened.
    sidebarService.open();
    fixture.detectChanges();

    const sidebars = fixture.debugElement.queryAll(By.directive(DashboardLayoutSidebar));

    expect(sidebars).toHaveLength(1);
    expect(fixture.debugElement.queryAll(By.css('app-dashboard-layout-org-rail'))).toHaveLength(1);
    expect(sidebars[0].componentInstance.variant()).not.toBe('primary');
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

  // Collapsing hides the sidebar outright. It must never fall back to an
  // icon-only rail: with a permanent organization rail, a second icon rail
  // rebuilds the two-column navigation that was deliberately removed.
  it('should collapse the sidebar to zero width, never to an icon rail', () => {
    const fixture = TestBed.createComponent(DashboardLayout);
    const sidebarService = fixture.debugElement.injector.get(DashboardSidebarService);
    const shell = fixture.componentInstance as unknown as {
      readonly sidebarInlineWidth: () => number;
    };
    fixture.detectChanges();

    expect(shell.sidebarInlineWidth()).toBe(SHELL_SIDEBAR_WIDTH_PX);

    sidebarService.setPrimaryCollapsed(true);
    fixture.detectChanges();

    expect(shell.sidebarInlineWidth()).toBe(0);
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
