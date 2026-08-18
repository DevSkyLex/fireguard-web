import { Component, signal, type Type } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ENV_CONFIG } from '@core/config/environment/env.token';
import type { ExclusiveSlotContribution, SlotContribution } from '@shared/layout-slot';
import { DashboardLayout } from '../dashboard-layout.component';
import {
  DASHBOARD_HEADER_ACTIONS_SLOT,
  DASHBOARD_HEADER_SLOT,
  DASHBOARD_PANEL_SLOT,
  DASHBOARD_SIDEBAR_FOOTER_SLOT,
  DASHBOARD_SIDEBAR_HEADER_SLOT,
  DASHBOARD_SIDEBAR_NAV_SLOT,
} from '../slots';

@Component({ selector: 'app-nav-stub', template: '<p id="nav-stub">nav</p>' })
class NavStub {}

@Component({ selector: 'app-panel-stub', template: '<p id="panel-stub">panel</p>' })
class PanelStub {}

function additive(id: string, component: Type<unknown>): SlotContribution {
  return { id, order: 10, component };
}

function panel(priority: number, active: boolean): ExclusiveSlotContribution {
  return {
    id: `panel-${priority}`,
    priority,
    component: PanelStub as Type<unknown>,
    active: signal(active),
  };
}

async function render(providers: unknown[] = []): Promise<ComponentFixture<DashboardLayout>> {
  await TestBed.configureTestingModule({
    imports: [DashboardLayout],
    providers: [
      provideRouter([]),
      { provide: ENV_CONFIG, useValue: { appName: 'FireGuard' } },
      ...(providers as never[]),
    ],
  }).compileComponents();

  const fixture: ComponentFixture<DashboardLayout> = TestBed.createComponent(DashboardLayout);
  fixture.detectChanges();

  return fixture;
}

describe('DashboardLayout', () => {
  it('renders the shell frame with no contribution at all', async () => {
    const fixture = await render();
    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelector('#dashboard-layout')).not.toBeNull();
    expect(element.querySelector('hlm-sidebar')).not.toBeNull();
    expect(element.querySelector('#dashboard-main')).not.toBeNull();
    expect(element.querySelector('[data-testid="dashboard-skip-link"]')).not.toBeNull();
    expect(element.querySelector('#dashboard-panel')).toBeNull();
  });

  it('dresses the sidebar as spartan inset', async () => {
    const fixture = await render();
    const sidebar: HTMLElement | null = fixture.nativeElement.querySelector('hlm-sidebar');

    // The inset variant is the shell's look, not a detail: it is what turns the
    // main column into a floating card over a `bg-sidebar` canvas.
    expect(sidebar?.getAttribute('data-variant')).toBe('inset');
  });

  it('omits the sidebar header and footer while nothing is contributed to them', async () => {
    const fixture = await render();
    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelector('[data-slot="sidebar-header"]')).toBeNull();
    expect(element.querySelector('[data-slot="sidebar-footer"]')).toBeNull();
    // The nav body is always rendered: it is the sidebar's scroll container.
    expect(element.querySelector('[data-slot="sidebar-content"]')).not.toBeNull();
  });

  it('fills each additive slot with its contributions', async () => {
    const fixture = await render([
      { provide: DASHBOARD_SIDEBAR_HEADER_SLOT, useValue: [additive('brand', NavStub)] },
      { provide: DASHBOARD_SIDEBAR_NAV_SLOT, useValue: [additive('nav', NavStub)] },
      { provide: DASHBOARD_SIDEBAR_FOOTER_SLOT, useValue: [additive('account', NavStub)] },
      { provide: DASHBOARD_HEADER_SLOT, useValue: [additive('trail', NavStub)] },
      { provide: DASHBOARD_HEADER_ACTIONS_SLOT, useValue: [additive('tools', NavStub)] },
    ]);
    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelector('[data-slot="sidebar-header"] #nav-stub')).not.toBeNull();
    expect(element.querySelector('[data-slot="sidebar-content"] #nav-stub')).not.toBeNull();
    expect(element.querySelector('[data-slot="sidebar-footer"] #nav-stub')).not.toBeNull();
    expect(element.querySelectorAll('header #nav-stub')).toHaveLength(2);
  });

  it('gives the panel to the highest priority active contribution', async () => {
    const fixture = await render([
      { provide: DASHBOARD_PANEL_SLOT, useValue: [panel(10, true), panel(90, false)] },
    ]);

    expect(fixture.nativeElement.querySelector('#dashboard-panel #panel-stub')).not.toBeNull();
  });

  it('leaves the panel out while no contribution is active', async () => {
    const fixture = await render([{ provide: DASHBOARD_PANEL_SLOT, useValue: [panel(10, false)] }]);

    expect(fixture.nativeElement.querySelector('#dashboard-panel')).toBeNull();
  });

  it('moves focus to the routed content column from the skip link without navigating', async () => {
    const fixture = await render();
    const element: HTMLElement = fixture.nativeElement;
    const link: HTMLAnchorElement | null = element.querySelector<HTMLAnchorElement>(
      '[data-testid="dashboard-skip-link"]',
    );
    const event: MouseEvent = new MouseEvent('click', { cancelable: true, bubbles: true });

    expect(link).not.toBeNull();
    link?.dispatchEvent(event); // `<base href="/">` would otherwise hard-navigate to the app root.

    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(element.querySelector('#dashboard-content'));
  });
});
