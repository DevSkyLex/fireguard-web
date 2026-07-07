import { TestBed } from '@angular/core/testing';
import type { DrawerPassThroughOptions } from 'primeng/drawer';
import { OrganizationInviteDrawer } from '../organization-invite-drawer.component';

type InviteDrawerTestApi = OrganizationInviteDrawer & { drawerPt: DrawerPassThroughOptions };

describe('OrganizationInviteDrawer', () => {
  let component: InviteDrawerTestApi;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    component = TestBed.runInInjectionContext(
      () => new OrganizationInviteDrawer() as unknown as InviteDrawerTestApi,
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
