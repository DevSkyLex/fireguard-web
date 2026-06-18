import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { DrawerPassThroughOptions } from 'primeng/drawer';
import type { InterventionOutput } from '@features/organization/features/interventions/models';
import { InterventionEditDrawer } from '../intervention-edit-drawer.component';

type InterventionEditDrawerHarness = {
  readonly visible: () => boolean;
  readonly loading: () => boolean;
  readonly disabled: () => boolean;
  readonly drawerPt: DrawerPassThroughOptions;
};

describe('InterventionEditDrawer', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [InterventionEditDrawer],
    }).overrideComponent(InterventionEditDrawer, {
      set: {
        imports: [],
        schemas: [CUSTOM_ELEMENTS_SCHEMA],
      },
    });
  });

  function createComponent(): InterventionEditDrawerHarness {
    const fixture = TestBed.createComponent(InterventionEditDrawer);
    fixture.componentRef.setInput('intervention', {} as InterventionOutput);
    fixture.detectChanges();

    return fixture.componentInstance as unknown as InterventionEditDrawerHarness;
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

  it('should size the panel to give the two-column planning form room on wider viewports', () => {
    const component = createComponent();
    const rootClass = (component.drawerPt.root as { class: string }).class;

    expect(rootClass).toContain('!w-full');
    expect(rootClass).toContain('md:!w-[52rem]');
    expect(rootClass).toContain('xl:!w-[60rem]');
  });
});
