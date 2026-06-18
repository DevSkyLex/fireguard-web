import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { DrawerPassThroughOptions } from 'primeng/drawer';
import { InterventionWorkItemDrawer } from '../intervention-work-item-drawer.component';

type InterventionWorkItemDrawerHarness = {
  readonly visible: () => boolean;
  readonly loading: () => boolean;
  readonly disabled: () => boolean;
  readonly drawerPt: DrawerPassThroughOptions;
};

describe('InterventionWorkItemDrawer', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [InterventionWorkItemDrawer],
    }).overrideComponent(InterventionWorkItemDrawer, {
      set: {
        imports: [],
        schemas: [CUSTOM_ELEMENTS_SCHEMA],
      },
    });
  });

  function createComponent(): InterventionWorkItemDrawerHarness {
    const fixture = TestBed.createComponent(InterventionWorkItemDrawer);
    fixture.detectChanges();

    return fixture.componentInstance as unknown as InterventionWorkItemDrawerHarness;
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

  it('should size the panel as a compact right-side drawer', () => {
    const component = createComponent();
    const rootClass = (component.drawerPt.root as { class: string }).class;

    expect(rootClass).toContain('!w-full');
    expect(rootClass).toContain('sm:!w-[34rem]');
  });
});
