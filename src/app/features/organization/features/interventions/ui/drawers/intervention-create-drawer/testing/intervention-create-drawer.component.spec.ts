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
    expect(rootClass).toContain('md:!w-[52rem]');
    expect(rootClass).toContain('xl:!w-[60rem]');
  });
});
