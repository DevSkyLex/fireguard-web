import { ChangeDetectionStrategy, Component, inject, signal, type Type } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ENV_CONFIG } from '@core/config/environment/env.token';
import {
  type ExclusiveSlotContribution,
  SLOT_PRESENTATION,
  type SlotContribution,
  type SlotPresentation,
} from '@shared/layout-slot';
import { HlmSidebarService } from '@shared/ui/sidebar';
import { DashboardLayout } from '../dashboard-layout.component';
import type { SidebarExtensionContribution } from '../models';
import {
  DASHBOARD_HEADER_ACTIONS_SLOT,
  DASHBOARD_HEADER_SLOT,
  DASHBOARD_PANEL_SLOT,
  DASHBOARD_SIDEBAR_FOOTER_SLOT,
  DASHBOARD_SIDEBAR_HEADER_SLOT,
  DASHBOARD_SIDEBAR_EXTENSION_SLOT,
  DASHBOARD_SIDEBAR_NAV_SLOT,
} from '../slots';

@Component({ selector: 'app-nav-stub', template: '<p id="nav-stub">nav</p>' })
class NavStub {}

@Component({ selector: 'app-panel-stub', template: '<p id="panel-stub">panel</p>' })
class PanelStub {}

@Component({
  selector: 'app-presentation-stub',
  template: '<p id="presentation-stub">{{ presentation }}</p>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class PresentationStub {
  protected readonly presentation: SlotPresentation = inject<SlotPresentation>(SLOT_PRESENTATION);
}

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
      { provide: ENV_CONFIG, useValue: { appName: 'Fireguard' } },
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

  it('uses the standard sidebar variant for a flush content column', async () => {
    const fixture = await render();
    const sidebar: HTMLElement | null = fixture.nativeElement.querySelector('hlm-sidebar');

    expect(sidebar?.getAttribute('data-variant')).toBe('sidebar');
  });

  it('owns the standard vertical spacing for routed pages', async () => {
    const fixture = await render();
    const content: HTMLElement | null = fixture.nativeElement.querySelector(
      '[data-testid="dashboard-content-container"]',
    );

    expect(content?.classList.contains('py-4')).toBe(true);
    expect(content?.classList.contains('md:py-6')).toBe(true);
    expect(content?.classList.contains('max-sm:px-4')).toBe(true);
  });

  it('shares the compact phone gutter across the shell bands', async () => {
    const fixture = await render();
    const element: HTMLElement = fixture.nativeElement;

    expect(
      element
        .querySelector('[data-testid="dashboard-toolbar-container"]')
        ?.classList.contains('max-sm:px-4'),
    ).toBe(true);
    expect(
      element
        .querySelector('[data-testid="dashboard-page-header-container"]')
        ?.classList.contains('max-sm:px-4'),
    ).toBe(true);
  });

  it('lets a full-height sidebar workspace remove the standard content spacing', async () => {
    const contribution: SidebarExtensionContribution = {
      id: 'workspace',
      component: PanelStub,
      priority: 20,
      active: signal(true),
      label: 'Workspace',
      mobileVisible: signal(false),
      contentPadding: false,
    };
    const fixture = await render([
      { provide: DASHBOARD_SIDEBAR_EXTENSION_SLOT, useValue: [contribution] },
    ]);
    const content: HTMLElement | null = fixture.nativeElement.querySelector(
      '[data-testid="dashboard-content-container"]',
    );

    expect(content?.classList.contains('py-4')).toBe(false);
    expect(content?.classList.contains('md:py-6')).toBe(false);
  });

  it('keeps the brand without header contributions and omits an empty footer', async () => {
    const fixture = await render();
    const element: HTMLElement = fixture.nativeElement;

    expect(
      element
        .querySelector('[data-slot="sidebar-header"] #dashboard-sidebar-brand img')
        ?.getAttribute('alt'),
    ).toBe('Fireguard');
    expect(element.querySelector('[data-slot="sidebar-header"] app-slot-outlet')).toBeNull();
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

  it('moves header actions into the native drawer on mobile', async () => {
    const toggleSidebar = vi.fn();
    const fixture = await render([
      {
        provide: HlmSidebarService,
        useValue: {
          isMobile: signal(true),
          openMobile: signal(false),
          state: signal<'expanded' | 'collapsed'>('expanded'),
          variant: signal<'sidebar' | 'floating' | 'inset'>('sidebar'),
          setVariant: vi.fn(),
          setOpenMobile: vi.fn(),
          toggleSidebar,
        },
      },
      {
        provide: DASHBOARD_HEADER_ACTIONS_SLOT,
        useValue: [additive('tools', PresentationStub)],
      },
    ]);
    const element: HTMLElement = fixture.nativeElement;
    const trigger: HTMLButtonElement | null = element.querySelector(
      '[data-testid="dashboard-mobile-actions-trigger"]',
    );

    expect(trigger).not.toBeNull();
    expect(element.querySelector('[data-testid="dashboard-desktop-actions"]')).toBeNull();
    const sidebarTrigger = element.querySelector<HTMLButtonElement>(
      '[data-testid="dashboard-sidebar-trigger"]',
    );
    expect(sidebarTrigger?.querySelector('ng-icon')?.getAttribute('name')).toBe('lucideMenu');
    sidebarTrigger?.click();
    expect(toggleSidebar).toHaveBeenCalledOnce();

    trigger?.click();
    await fixture.whenStable();

    const drawer: HTMLElement | null = document.querySelector(
      '[data-testid="dashboard-mobile-actions-drawer"]',
    );
    expect(drawer?.querySelector('#presentation-stub')?.textContent).toBe('menu');
    expect(
      drawer?.querySelector('[data-testid="dashboard-mobile-actions"]')?.getAttribute('data-slot'),
    ).toBe('item-group');
    expect(drawer?.querySelector('[data-slot="drawer-header"]')?.classList).toContain(
      'text-start!',
    );
    expect(drawer?.querySelector('[data-slot="drawer-title"]')?.textContent?.trim()).toBe(
      'Quick actions',
    );

    (drawer?.querySelector('[data-slot="drawer-close"]') as HTMLButtonElement | null)?.click();
    await fixture.whenStable();
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

  it('mounts only the highest priority active extension and releases its column', async () => {
    const active = signal(false);
    const contribution: SidebarExtensionContribution = {
      id: 'messages',
      component: PanelStub,
      priority: 20,
      active,
      label: 'Messages',
      mobileVisible: signal(true),
    };
    const fixture = await render([
      {
        provide: DASHBOARD_SIDEBAR_EXTENSION_SLOT,
        useValue: [
          { ...contribution, id: 'fallback', priority: 10, component: NavStub },
          contribution,
        ],
      },
    ]);
    expect(fixture.nativeElement.querySelector('#dashboard-sidebar-extension')).toBeNull();
    active.set(true);
    await fixture.whenStable();
    const extension = fixture.nativeElement.querySelector('#dashboard-sidebar-extension');
    expect(extension.getAttribute('aria-label')).toBe('Messages');
    expect(extension.querySelector('#panel-stub')).not.toBeNull();
    expect(extension.querySelector('#nav-stub')).toBeNull();
    active.set(false);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('#dashboard-sidebar-extension')).toBeNull();
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
