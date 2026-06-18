import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { DrawerPassThroughOptions } from 'primeng/drawer';
import type { SelectOption } from '@features/organization/features/interventions/models';
import { InterventionDiscoveryDrawer } from '../intervention-discovery-drawer.component';

type InterventionDiscoveryDrawerHarness = {
  readonly visible: () => boolean;
  readonly loading: () => boolean;
  readonly disabled: () => boolean;
  readonly equipmentTypeOptions: () => readonly SelectOption[];
  readonly drawerPt: DrawerPassThroughOptions;
};

describe('InterventionDiscoveryDrawer', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [InterventionDiscoveryDrawer],
    }).overrideComponent(InterventionDiscoveryDrawer, {
      set: {
        imports: [],
        schemas: [CUSTOM_ELEMENTS_SCHEMA],
      },
    });
  });

  function createComponent(): InterventionDiscoveryDrawerHarness {
    const fixture = TestBed.createComponent(InterventionDiscoveryDrawer);
    fixture.detectChanges();

    return fixture.componentInstance as unknown as InterventionDiscoveryDrawerHarness;
  }

  it('should create', () => {
    const component = createComponent();

    expect(component).toBeTruthy();
  });

  it('should default to a closed, idle drawer with no equipment options', () => {
    const component = createComponent();

    expect(component.visible()).toBe(false);
    expect(component.loading()).toBe(false);
    expect(component.disabled()).toBe(false);
    expect(component.equipmentTypeOptions()).toEqual([]);
  });

  it('should size the right panel responsively', () => {
    const component = createComponent();
    const rootClass = (component.drawerPt.root as { class: string }).class;

    expect(rootClass).toContain('!w-full');
    expect(rootClass).toContain('sm:!w-[34rem]');
  });
});
