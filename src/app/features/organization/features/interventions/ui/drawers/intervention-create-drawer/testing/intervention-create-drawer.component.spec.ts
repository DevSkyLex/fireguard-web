import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { DrawerPassThroughOptions } from 'primeng/drawer';
import { InterventionCreateDrawer } from '../intervention-create-drawer.component';

type InterventionCreateDrawerHarness = {
  readonly visible: () => boolean;
  readonly loading: () => boolean;
  readonly optionsLoading: () => boolean;
  readonly drawerPt: DrawerPassThroughOptions;
};

describe('InterventionCreateDrawer', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [InterventionCreateDrawer],
    }).overrideComponent(InterventionCreateDrawer, {
      set: {
        imports: [],
        schemas: [CUSTOM_ELEMENTS_SCHEMA],
      },
    });
  });

  function createComponent(): InterventionCreateDrawerHarness {
    const fixture = TestBed.createComponent(InterventionCreateDrawer);
    fixture.detectChanges();

    return fixture.componentInstance as unknown as InterventionCreateDrawerHarness;
  }

  it('should create', () => {
    const component = createComponent();

    expect(component).toBeTruthy();
  });

  it('should default to a closed, idle drawer', () => {
    const component = createComponent();

    expect(component.visible()).toBe(false);
    expect(component.loading()).toBe(false);
    expect(component.optionsLoading()).toBe(false);
  });

  it('should size the panel to give the guided form room on wider viewports', () => {
    const component = createComponent();
    const rootClass = (component.drawerPt.root as { class: string }).class;

    expect(rootClass).toContain('!w-full');
    expect(rootClass).toContain('md:!w-[45rem]');
    expect(rootClass).toContain('xl:!w-[60rem]');
  });

  it('should never size the panel wider than the breakpoint that reveals it', () => {
    const component = createComponent();
    const rootClass = (component.drawerPt.root as { class: string }).class;

    // Breakpoints are media queries, so they are fixed in px regardless of the
    // root font size; the widths are rem and are not. A step wider than its own
    // breakpoint puts the drawer off-screen — which is exactly what happened
    // when `md:!w-[52rem]` (832px) met the 768px `md` breakpoint.
    const BREAKPOINTS_PX: Readonly<Record<string, number>> = { md: 768, lg: 1024, xl: 1280 };
    const REM_PX = 16;

    const steps = [...rootClass.matchAll(/(sm|md|lg|xl):!w-\[([0-9.]+)rem]/g)];

    expect(steps.length).toBeGreaterThan(0);

    steps.forEach(([, breakpoint, rem]: RegExpMatchArray) => {
      expect(Number(rem) * REM_PX).toBeLessThanOrEqual(BREAKPOINTS_PX[breakpoint]);
    });

    expect(rootClass).toContain('!max-w-[100vw]');
  });
});
