import { TestBed } from '@angular/core/testing';
import type { DrawerPassThroughOptions } from 'primeng/drawer';
import { OrganizationRoleAssignmentDrawer } from '../organization-role-assignment-drawer.component';

type RoleAssignmentDrawerTestApi = OrganizationRoleAssignmentDrawer & {
  drawerPt: DrawerPassThroughOptions;
};

describe('OrganizationRoleAssignmentDrawer', () => {
  let component: RoleAssignmentDrawerTestApi;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    component = TestBed.runInInjectionContext(
      () => new OrganizationRoleAssignmentDrawer() as unknown as RoleAssignmentDrawerTestApi,
    );
  });

  it('is hidden by default', () => {
    expect(component.visible()).toBe(false);
  });

  it('sizes the drawer responsively (full width on mobile)', () => {
    const rootClass = (component.drawerPt.root as { class: string }).class;
    expect(rootClass).toContain('!w-full');
    expect(rootClass).toContain('sm:!w-[30rem]');
  });
});
