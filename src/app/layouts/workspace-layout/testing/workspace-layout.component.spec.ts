import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { PANEL_SLOT, type PanelContribution } from '@layouts/workspace-layout/slots/panel';
import { RAIL_SLOT, type RailContribution } from '@layouts/workspace-layout/slots/rail';
import {
  SECONDARY_NAV_SLOT,
  type SecondaryNavContribution,
} from '@layouts/workspace-layout/slots/secondary-nav';
import { WorkspaceShellService } from '../services';
import { WorkspaceLayout } from '../workspace-layout.component';

@Component({ template: '<div data-testid="rail-lead-stub"></div>' })
class RailLeadStub {}

@Component({ template: '<div data-testid="rail-footer-stub"></div>' })
class RailFooterStub {}

@Component({ template: '<div data-testid="nav-section-stub"></div>' })
class NavSectionStub {}

@Component({ template: '<div data-testid="panel-stub"></div>' })
class PanelStub {}

describe('WorkspaceLayout', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [WorkspaceLayout],
      providers: [
        provideRouter([]),
        {
          provide: RAIL_SLOT,
          useValue: { id: 'orgs', order: 10, component: RailLeadStub } satisfies RailContribution,
          multi: true,
        },
        {
          provide: RAIL_SLOT,
          useValue: {
            id: 'seat',
            order: 10,
            region: 'footer',
            component: RailFooterStub,
          } satisfies RailContribution,
          multi: true,
        },
        {
          provide: SECONDARY_NAV_SLOT,
          useValue: {
            id: 'channels',
            order: 10,
            component: NavSectionStub,
          } satisfies SecondaryNavContribution,
          multi: true,
        },
        {
          provide: PANEL_SLOT,
          useValue: {
            id: 'info',
            priority: 10,
            active: signal<boolean>(true),
            component: PanelStub,
            widthClass: 'lg:w-[330px]',
            ariaLabel: 'Channel details',
          } satisfies PanelContribution,
          multi: true,
        },
      ],
    });
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(WorkspaceLayout);

    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the four columns', () => {
    const fixture = TestBed.createComponent(WorkspaceLayout);
    const shell = fixture.debugElement.injector.get(WorkspaceShellService);
    // No viewport exists under TestBed, so the shell reads as mobile on the
    // `list` pane — where the panel is deliberately not rendered, and where
    // `showMain()` closes it as a mobile navigation would.
    shell.showMain();
    shell.setPanelVisible(true);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('app-workspace-layout-rail'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('app-workspace-layout-secondary-nav'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('router-outlet'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('app-workspace-layout-panel-outlet'))).toBeTruthy();
  });

  it('should never scroll the shell itself', () => {
    const fixture = TestBed.createComponent(WorkspaceLayout);
    fixture.detectChanges();

    const shell = fixture.debugElement.query(By.css('#workspace-layout'))
      .nativeElement as HTMLElement;

    expect(shell.classList).toContain('overflow-hidden');
    expect(shell.classList).toContain('h-dvh');
  });

  it('should render rail contributions in both regions', () => {
    const fixture = TestBed.createComponent(WorkspaceLayout);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('[data-testid="rail-lead-stub"]'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('[data-testid="rail-footer-stub"]'))).toBeTruthy();
  });

  it('should render contributed sidebar sections', () => {
    const fixture = TestBed.createComponent(WorkspaceLayout);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('[data-testid="nav-section-stub"]'))).toBeTruthy();
  });

  it('should drop the panel outlet when the shell hides the panel', () => {
    const fixture = TestBed.createComponent(WorkspaceLayout);
    const shell = fixture.debugElement.injector.get(WorkspaceShellService);
    shell.showMain();
    shell.setPanelVisible(true);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('[data-testid="panel-stub"]'))).toBeTruthy();

    shell.setPanelVisible(false);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('app-workspace-layout-panel-outlet'))).toBeFalsy();
  });

  it('should keep the panel off the mobile list pane', () => {
    const fixture = TestBed.createComponent(WorkspaceLayout);
    const shell = fixture.debugElement.injector.get(WorkspaceShellService);
    shell.showMain();
    shell.setPanelVisible(true);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('[data-testid="panel-stub"]'))).toBeTruthy();

    // Below the desktop breakpoint the panel is an `inset-0` overlay above both
    // other columns, so leaving it mounted here would paint it over the channel
    // list — for a channel the member has not opened.
    shell.showList();
    fixture.detectChanges();

    expect(shell.panelVisible()).toBe(true);
    expect(fixture.debugElement.query(By.css('app-workspace-layout-panel-outlet'))).toBeFalsy();
  });

  it('should swap the visible mobile pane', () => {
    const fixture = TestBed.createComponent(WorkspaceLayout);
    const shell = fixture.debugElement.injector.get(WorkspaceShellService);
    fixture.detectChanges();

    const aside = fixture.debugElement.query(By.css('aside')).nativeElement as HTMLElement;
    const main = fixture.debugElement.query(By.css('main')).nativeElement as HTMLElement;

    // Default pane is `list`: the sidebar shows, the main column is hidden.
    expect(aside.classList).not.toContain('max-lg:hidden');
    expect(main.classList).toContain('max-lg:hidden');

    shell.showMain();
    fixture.detectChanges();

    expect(aside.classList).toContain('max-lg:hidden');
    expect(main.classList).not.toContain('max-lg:hidden');
  });

  it('should collapse the sidebar on desktop without unmounting it', () => {
    const fixture = TestBed.createComponent(WorkspaceLayout);
    const shell = fixture.debugElement.injector.get(WorkspaceShellService);
    fixture.detectChanges();

    shell.setSidebarCollapsed(true);
    fixture.detectChanges();

    const aside = fixture.debugElement.query(By.css('aside')).nativeElement as HTMLElement;

    expect(aside.classList).toContain('lg:hidden');
  });
});
