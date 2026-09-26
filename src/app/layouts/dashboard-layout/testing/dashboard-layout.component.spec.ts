import {
  ChangeDetectionStrategy,
  Component,
  type EnvironmentProviders,
  inject,
  type Provider,
  signal,
  type Type,
} from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { ENV_CONFIG } from '@core/config/environment/env.token';
import { INTERACTION_CAPABILITIES_PORT } from '@core/interaction-capabilities';
import { DASHBOARD_MOBILE_NAVIGATION_ROOT_DATA_KEY } from '@core/routing';
import { TitleService } from '@core/title';
import {
  SLOT_PRESENTATION,
  type SlotContribution,
  type SlotPresentation,
} from '@shared/layout-slot';
import { HlmDialogService } from '@shared/ui/dialog';
import { HlmDrawer } from '@shared/ui/drawer';
import { HlmSidebarService } from '@shared/ui/sidebar';
import { DashboardLayout } from '../dashboard-layout.component';
import type { DashboardPanelContribution, SidebarExtensionContribution } from '../models';
import {
  DASHBOARD_HEADER_ACTIONS_SLOT,
  DASHBOARD_MOBILE_ACTIONS_SLOT,
  DASHBOARD_MOBILE_NAVIGATION_SLOT,
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

function panel(priority: number, active: boolean): DashboardPanelContribution {
  return {
    id: `panel-${priority}`,
    priority,
    component: PanelStub as Type<unknown>,
    label: 'Contextual panel',
    active: signal(active),
  };
}

async function render(
  providers: readonly (Provider | EnvironmentProviders)[] = [],
): Promise<ComponentFixture<DashboardLayout>> {
  await TestBed.configureTestingModule({
    imports: [DashboardLayout],
    providers: [
      provideRouter([]),
      { provide: ENV_CONFIG, useValue: { appName: 'Fireguard' } },
      {
        provide: INTERACTION_CAPABILITIES_PORT,
        useValue: { isMobileInteractionMode: signal(false) },
      },
      ...providers,
    ],
  }).compileComponents();

  const fixture: ComponentFixture<DashboardLayout> = TestBed.createComponent(DashboardLayout);
  fixture.detectChanges();

  return fixture;
}

describe('DashboardLayout', () => {
  it('renders mobile-only feature actions without requiring desktop header tools', async () => {
    const fixture = await render([
      {
        provide: INTERACTION_CAPABILITIES_PORT,
        useValue: { isMobileInteractionMode: signal(true) },
      },
      {
        provide: DASHBOARD_MOBILE_ACTIONS_SLOT,
        useValue: [additive('account-tools', PresentationStub)],
      },
    ]);
    const trigger: HTMLButtonElement | null = fixture.nativeElement.querySelector(
      '[data-testid="dashboard-mobile-actions-trigger"]',
    );
    expect(trigger).not.toBeNull();
    trigger?.click();
    await fixture.whenStable();
    const drawer = document.querySelector('[data-testid="dashboard-mobile-actions-drawer"]');
    expect(drawer?.querySelector('#presentation-stub')?.textContent).toBe('menu');
  });

  afterEach(() => vi.unstubAllGlobals());

  it('hides back navigation on mobile roots and restores it on their detail routes', async () => {
    const fixture = await render([
      {
        provide: INTERACTION_CAPABILITIES_PORT,
        useValue: { isMobileInteractionMode: signal(true) },
      },
    ]);
    const router = TestBed.inject(Router);
    router.resetConfig([
      {
        path: 'workspace',
        data: { breadcrumb: 'Workspace' },
        children: [
          {
            path: 'assets',
            data: { breadcrumb: 'Assets' },
            children: [
              {
                path: '',
                pathMatch: 'full',
                component: NavStub,
                data: { [DASHBOARD_MOBILE_NAVIGATION_ROOT_DATA_KEY]: true },
              },
              {
                path: ':assetId',
                component: NavStub,
                data: { breadcrumb: 'Asset details' },
              },
            ],
          },
        ],
      },
    ]);

    await router.navigateByUrl('/workspace/assets');
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[data-testid="dashboard-back"]')).toBeNull();

    await router.navigateByUrl('/workspace/assets/asset-1');
    await fixture.whenStable();
    const backLink = fixture.nativeElement.querySelector(
      '[data-testid="dashboard-back"]',
    ) as HTMLAnchorElement | null;
    expect(backLink?.getAttribute('href')).toBe('/workspace/assets');
  });

  it('publishes the full navigation border box and disconnects when mobile chrome leaves', async () => {
    const mobile = signal(true);
    const observe = vi.fn();
    const disconnect = vi.fn();
    let notifyResize: () => void = vi.fn();
    vi.stubGlobal(
      'ResizeObserver',
      class {
        public readonly observe: ReturnType<typeof vi.fn> = observe;
        public readonly disconnect: ReturnType<typeof vi.fn> = disconnect;
        public constructor(callback: () => void) {
          notifyResize = callback;
        }
      },
    );
    const fixture = await render([
      { provide: INTERACTION_CAPABILITIES_PORT, useValue: { isMobileInteractionMode: mobile } },
      { provide: DASHBOARD_MOBILE_NAVIGATION_SLOT, useValue: [additive('mobile', NavStub)] },
    ]);
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    const region = root.querySelector<HTMLElement>('#dashboard-mobile-navigation');
    if (!region) throw new Error('The mobile navigation band must be mounted.');
    const bounds = vi.spyOn(region, 'getBoundingClientRect');
    const outlet = root.querySelector('router-outlet');

    expect(observe).toHaveBeenCalledWith(region, { box: 'border-box' });
    const assertHeight = async (height: number): Promise<void> => {
      bounds.mockReturnValue(new DOMRect(0, 0, 390, height));
      notifyResize();
      await fixture.whenStable();
      expect(
        root
          .querySelector<HTMLElement>('#dashboard-layout')
          ?.style.getPropertyValue('--mobile-navigation-height'),
      ).toBe(`${height}px`);
      expect(root.querySelector('router-outlet')).toBe(outlet);
    };
    await assertHeight(104);
    await assertHeight(136);

    mobile.set(false);
    await fixture.whenStable();
    expect(disconnect).toHaveBeenCalledTimes(1);
    expect(root.querySelector('#dashboard-mobile-navigation')).toBeNull();
    expect(
      root
        .querySelector<HTMLElement>('#dashboard-layout')
        ?.style.getPropertyValue('--mobile-navigation-height'),
    ).toBe('0px');
    expect(root.querySelector('router-outlet')).toBe(outlet);
  });

  it('measures the navigation on window resize when ResizeObserver is unavailable', async () => {
    vi.stubGlobal('ResizeObserver', undefined);
    const fixture = await render([
      {
        provide: INTERACTION_CAPABILITIES_PORT,
        useValue: { isMobileInteractionMode: signal(true) },
      },
      { provide: DASHBOARD_MOBILE_NAVIGATION_SLOT, useValue: [additive('mobile', NavStub)] },
    ]);
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    const region = root.querySelector<HTMLElement>('#dashboard-mobile-navigation');
    if (!region) throw new Error('The mobile navigation band must be mounted.');
    vi.spyOn(region, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 390, 112));

    window.dispatchEvent(new Event('resize'));
    await fixture.whenStable();
    expect(
      root
        .querySelector<HTMLElement>('#dashboard-layout')
        ?.style.getPropertyValue('--mobile-navigation-height'),
    ).toBe('112px');
  });

  it('fits the visual viewport after keyboard resize without changing interaction mode or outlet', async () => {
    const viewport = Object.assign(new EventTarget(), { height: 900, scale: 1 });
    vi.stubGlobal('visualViewport', viewport);
    const fixture = await render([
      {
        provide: INTERACTION_CAPABILITIES_PORT,
        useValue: { isMobileInteractionMode: signal(true) },
      },
    ]);
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    const outlet = root.querySelector('router-outlet');
    viewport.height = 480;
    viewport.dispatchEvent(new Event('resize'));
    await fixture.whenStable();
    expect(root.querySelector<HTMLElement>('#dashboard-layout')?.style.height).toBe('480px');
    expect(root.querySelector('router-outlet')).toBe(outlet);
    expect(root.querySelector('hlm-sidebar')).toBeNull();
    viewport.scale = 2;
    viewport.height = 240;
    viewport.dispatchEvent(new Event('resize'));
    await fixture.whenStable();
    expect(root.querySelector<HTMLElement>('#dashboard-layout')?.style.height).toBe('480px');
  });

  it('preserves the routed instance and title when switching interaction modes', async () => {
    const mobile = signal(false);
    const fixture = await render([
      provideRouter([{ path: 'example', component: NavStub }]),
      { provide: INTERACTION_CAPABILITIES_PORT, useValue: { isMobileInteractionMode: mobile } },
      { provide: DASHBOARD_MOBILE_NAVIGATION_SLOT, useValue: [additive('mobile', PanelStub)] },
      { provide: TitleService, useValue: { pageTitle: signal('Example workspace') } },
    ]);
    await TestBed.inject(Router).navigateByUrl('/example');
    await fixture.whenStable();
    const routedInstance: unknown = fixture.debugElement.query(
      By.directive(NavStub),
    ).componentInstance;
    const root: HTMLElement = fixture.nativeElement;

    const assertMode = async (nextMode: boolean): Promise<void> => {
      mobile.set(nextMode);
      await fixture.whenStable();
      expect(fixture.debugElement.query(By.directive(NavStub)).componentInstance).toBe(
        routedInstance,
      );
      expect(root.querySelectorAll('router-outlet')).toHaveLength(1);
      expect(root.querySelectorAll('h1')).toHaveLength(1);
      expect(root.querySelector('h1')?.textContent?.trim()).toBe('Example workspace');
      expect(root.querySelector('#dashboard-mobile-navigation') !== null).toBe(nextMode);
      expect(root.querySelector('hlm-sidebar') !== null).toBe(!nextMode);
      expect(
        root
          .querySelector<HTMLElement>('#dashboard-layout')
          ?.style.getPropertyValue('--mobile-navigation-height'),
      ).toBe(nextMode ? 'calc(4rem + env(safe-area-inset-bottom))' : '0px');
    };
    await assertMode(true);
    await assertMode(false);
    await assertMode(true);
  });

  it('retains desktop tools with the compact native sidebar', async () => {
    const fixture = await render([
      { provide: DASHBOARD_HEADER_ACTIONS_SLOT, useValue: [additive('tools', PresentationStub)] },
      {
        provide: HlmSidebarService,
        useValue: {
          isMobile: signal(true),
          openMobile: signal(false),
          state: signal('expanded'),
          variant: signal('sidebar'),
          setVariant: vi.fn(),
          setOpenMobile: vi.fn(),
          toggleSidebar: vi.fn(),
        },
      },
    ]);
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector('[data-testid="dashboard-desktop-actions"]')).not.toBeNull();
    expect(root.querySelector('[data-testid="dashboard-mobile-actions-trigger"]')).toBeNull();
    expect(
      root.querySelector('[data-testid="dashboard-sidebar-trigger"] ng-icon')?.getAttribute('name'),
    ).toBe('lucideMenu');
  });

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

  it('owns page scrolling at the main inset while keeping shell chrome sticky', async () => {
    const fixture = await render();
    const root: HTMLElement = fixture.nativeElement;
    const main: HTMLElement | null = root.querySelector('#dashboard-main');
    const content: HTMLElement | null = root.querySelector('#dashboard-content');
    const desktopChrome: HTMLElement | null =
      main?.querySelector('[data-testid="dashboard-desktop-chrome"]') ?? null;
    const toolbar: HTMLElement | null = main?.querySelector('header') ?? null;
    const pageHeader: HTMLElement | null = main?.querySelector('app-dashboard-page-header') ?? null;

    expect(main?.classList.contains('overflow-y-auto')).toBe(true);
    expect(content?.classList.contains('overflow-y-auto')).toBe(false);
    expect(desktopChrome?.classList.contains('sticky')).toBe(true);
    expect(desktopChrome?.classList.contains('top-0')).toBe(true);
    expect(desktopChrome?.classList.contains('bg-background')).toBe(true);
    expect(toolbar?.classList.contains('sticky')).toBe(false);
    expect(pageHeader?.classList.contains('sticky')).toBe(false);
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

  it('keeps mobile shell chrome clear of device safe areas', async () => {
    const fixture = await render([
      {
        provide: INTERACTION_CAPABILITIES_PORT,
        useValue: { isMobileInteractionMode: signal(true) },
      },
    ]);
    const toolbar: HTMLElement | null = fixture.nativeElement.querySelector('header');

    expect(toolbar?.classList.contains('mobile-ui:pt-[env(safe-area-inset-top)]')).toBe(true);
    expect(toolbar?.classList.contains('mobile-ui:h-[calc(4rem+env(safe-area-inset-top))]')).toBe(
      true,
    );
    expect(fixture.nativeElement.querySelector('h1')).toBeNull();
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
        provide: INTERACTION_CAPABILITIES_PORT,
        useValue: { isMobileInteractionMode: signal(true) },
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
    expect(sidebarTrigger).toBeNull();
    expect(element.querySelector('hlm-sidebar')).toBeNull();
    expect(toggleSidebar).not.toHaveBeenCalled();

    trigger?.click();
    await fixture.whenStable();

    const drawer: HTMLElement | null = document.querySelector(
      '[data-testid="dashboard-mobile-actions-drawer"]',
    );
    expect(drawer?.querySelector('#presentation-stub')?.textContent).toBe('menu');
    expect(
      drawer?.querySelector('[data-testid="dashboard-mobile-actions"]')?.getAttribute('data-slot'),
    ).toBe('item-group');
    const headingGroup = drawer?.querySelector('[data-slot="drawer-title"]')?.parentElement;
    expect(headingGroup?.classList).toContain('text-start');
    expect(headingGroup?.parentElement?.getAttribute('data-slot')).toBe('drawer-header');
    expect(headingGroup?.querySelector('[data-slot="drawer-description"]')).not.toBeNull();
    expect(drawer?.querySelector('[data-slot="drawer-title"]')?.textContent?.trim()).toBe(
      'Quick actions',
    );
    const nativeDrawer: HlmDrawer = fixture.debugElement.query(
      By.directive(HlmDrawer),
    ).componentInstance;
    const focusStart = drawer?.querySelector<HTMLElement>('[cdkFocusRegionStart]');
    const focusEnd = drawer?.querySelector<HTMLButtonElement>('[cdkFocusRegionEnd]');
    expect(nativeDrawer.autoFocus()).toBe('first-heading');
    expect(focusStart?.tagName).toBe('H2');
    expect(focusStart?.getAttribute('tabindex')).toBe('-1');
    expect(document.activeElement).toBe(focusStart);
    expect(focusEnd?.hasAttribute('hlmDrawerClose')).toBe(true);
    expect(focusEnd?.disabled).toBe(false);

    (drawer?.querySelector('[data-slot="drawer-close"]') as HTMLButtonElement | null)?.click();
    await fixture.whenStable();
  });

  it('keeps the parent open while a child handles an outside click, then restores backdrop dismissal', async () => {
    const fixture = await render([
      {
        provide: INTERACTION_CAPABILITIES_PORT,
        useValue: { isMobileInteractionMode: signal(true) },
      },
      { provide: DASHBOARD_HEADER_ACTIONS_SLOT, useValue: [additive('tools', PresentationStub)] },
    ]);
    const trigger: HTMLButtonElement = fixture.nativeElement.querySelector(
      '[data-testid="dashboard-mobile-actions-trigger"]',
    );
    trigger.click();
    await fixture.whenStable();
    const parentBackdrop = document.querySelector<HTMLElement>('.cdk-overlay-backdrop');
    if (!parentBackdrop) throw new Error('The quick-actions backdrop must exist.');
    const child = TestBed.inject(HlmDialogService).open(NavStub, {
      id: 'test-quick-actions-child',
      showCloseButton: false,
    });
    await fixture.whenStable();

    parentBackdrop.click();
    await fixture.whenStable();
    expect(child.state()).toBe('closed');
    expect(
      document.querySelector('[data-testid="dashboard-mobile-actions-drawer"]'),
    ).not.toBeNull();

    parentBackdrop.click();
    await fixture.whenStable();
    expect(document.querySelector('[data-testid="dashboard-mobile-actions-drawer"]')).toBeNull();

    trigger.click();
    await fixture.whenStable();
    document.querySelector<HTMLElement>('.cdk-overlay-backdrop')?.click();
    await fixture.whenStable();
    expect(document.querySelector('[data-testid="dashboard-mobile-actions-drawer"]')).toBeNull();
  });

  it('gives the panel to the highest priority active contribution', async () => {
    const fixture = await render([
      { provide: DASHBOARD_PANEL_SLOT, useValue: [panel(10, true), panel(90, false)] },
    ]);

    const contextualPanel: HTMLElement | null =
      fixture.nativeElement.querySelector('#dashboard-panel');

    expect(contextualPanel?.querySelector('#panel-stub')).not.toBeNull();
    expect(contextualPanel?.getAttribute('aria-label')).toBe('Contextual panel');
    expect(contextualPanel?.getAttribute('data-panel-size')).toBe('24');
    expect(
      fixture.nativeElement.querySelector('#dashboard-main-panel')?.getAttribute('data-panel-size'),
    ).toBe('76');
    expect(
      fixture.nativeElement
        .querySelector('[data-testid="dashboard-panel-resize-handle"]')
        ?.getAttribute('role'),
    ).toBe('separator');
  });

  it('dismisses mobile quick actions on successful navigation but not a rejected guard', async () => {
    const fixture = await render([
      {
        provide: INTERACTION_CAPABILITIES_PORT,
        useValue: { isMobileInteractionMode: signal(true) },
      },
      { provide: DASHBOARD_HEADER_ACTIONS_SLOT, useValue: [additive('tools', PresentationStub)] },
    ]);
    const router = TestBed.inject(Router);
    router.resetConfig([
      { path: 'blocked', component: NavStub, canActivate: [(): boolean => false] },
      { path: 'destination', component: NavStub },
    ]);
    const trigger: HTMLButtonElement = fixture.nativeElement.querySelector(
      '[data-testid="dashboard-mobile-actions-trigger"]',
    );
    trigger.click();
    await fixture.whenStable();
    expect(
      document.querySelector('[data-testid="dashboard-mobile-actions-drawer"]'),
    ).not.toBeNull();
    await router.navigateByUrl('/blocked');
    await fixture.whenStable();
    expect(
      document.querySelector('[data-testid="dashboard-mobile-actions-drawer"]'),
    ).not.toBeNull();
    await router.navigateByUrl('/destination');
    await fixture.whenStable();
    expect(document.querySelector('[data-testid="dashboard-mobile-actions-drawer"]')).toBeNull();
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

  it('gives an active sidebar extension a bounded resizable panel and preserves main scrolling', async () => {
    const contribution: SidebarExtensionContribution = {
      id: 'messages',
      component: PanelStub,
      priority: 20,
      active: signal(true),
      label: 'Messages',
      mobileVisible: signal(true),
    };
    const fixture = await render([
      { provide: DASHBOARD_SIDEBAR_EXTENSION_SLOT, useValue: [contribution] },
    ]);
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    const group: HTMLElement | null = root.querySelector(
      '[data-testid="dashboard-workspace-panels"]',
    );
    const extension: HTMLElement | null = root.querySelector('#dashboard-sidebar-extension');
    const mainPanel: HTMLElement | null = root.querySelector('#dashboard-main-panel');
    const handle: HTMLElement | null = root.querySelector(
      '[data-testid="dashboard-sidebar-extension-resize-handle"]',
    );

    expect(group).not.toBeNull();
    expect(group?.getAttribute('data-panel-group-direction')).toBe('horizontal');
    expect(extension?.getAttribute('data-panel-size')).toBe('24');
    expect(mainPanel?.getAttribute('data-panel-size')).toBe('76');
    expect(handle?.getAttribute('role')).toBe('separator');
    expect(handle?.getAttribute('aria-orientation')).toBe('vertical');
    expect(handle?.getAttribute('aria-label')).toBe('Resize navigation panel');
    expect(mainPanel?.querySelector('#dashboard-main')).not.toBeNull();
    expect(mainPanel?.querySelector('#dashboard-main')?.classList.contains('overflow-y-auto')).toBe(
      true,
    );
  });

  it('shares the workspace among both side panels and keeps a bounded main region', async () => {
    const extension: SidebarExtensionContribution = {
      id: 'messages',
      component: NavStub,
      priority: 20,
      active: signal(true),
      label: 'Messages',
      mobileVisible: signal(false),
    };
    const fixture = await render([
      { provide: DASHBOARD_SIDEBAR_EXTENSION_SLOT, useValue: [extension] },
      { provide: DASHBOARD_PANEL_SLOT, useValue: [panel(10, true)] },
    ]);
    await fixture.whenStable();

    const root: HTMLElement = fixture.nativeElement;
    expect(
      root.querySelector('#dashboard-sidebar-extension')?.getAttribute('data-panel-size'),
    ).toBe('24');
    expect(root.querySelector('#dashboard-main-panel')?.getAttribute('data-panel-size')).toBe('52');
    expect(root.querySelector('#dashboard-panel')?.getAttribute('data-panel-size')).toBe('24');
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
