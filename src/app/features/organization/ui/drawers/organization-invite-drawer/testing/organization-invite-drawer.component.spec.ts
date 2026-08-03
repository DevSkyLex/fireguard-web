import { TestBed } from '@angular/core/testing';
import { OrganizationInviteDrawer } from '../organization-invite-drawer.component';

type InviteDrawerTestApi = OrganizationInviteDrawer & { drawerStyleClass: string };

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
    expect(component.drawerStyleClass).toContain('!w-full');
    expect(component.drawerStyleClass).toContain('sm:!w-[34rem]');
  });
});
