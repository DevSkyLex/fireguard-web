import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { DrawerPassThroughOptions } from 'primeng/drawer';
import { InterventionSkipDrawer } from '../intervention-skip-drawer.component';

type InterventionSkipDrawerHarness = {
  readonly visible: () => boolean;
  readonly loading: () => boolean;
  readonly disabled: () => boolean;
  readonly drawerPt: DrawerPassThroughOptions;
};

describe('InterventionSkipDrawer', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [InterventionSkipDrawer],
    }).overrideComponent(InterventionSkipDrawer, {
      set: {
        imports: [],
        schemas: [CUSTOM_ELEMENTS_SCHEMA],
      },
    });
  });

  function createComponent(): InterventionSkipDrawerHarness {
    const fixture = TestBed.createComponent(InterventionSkipDrawer);
    fixture.detectChanges();

    return fixture.componentInstance as unknown as InterventionSkipDrawerHarness;
  }

  it('should create', () => {
    const component = createComponent();

    expect(component).toBeTruthy();
  });

  it('should default to a closed, idle drawer', () => {
    const component = createComponent();

    expect(component.visible()).toBe(false);
    expect(component.loading()).toBe(false);
    expect(component.disabled()).toBe(false);
  });

  it('should size the right panel responsively', () => {
    const component = createComponent();
    const rootClass = (component.drawerPt.root as { class: string }).class;

    expect(rootClass).toContain('!w-full');
    expect(rootClass).toContain('sm:!w-[34rem]');
  });
});
