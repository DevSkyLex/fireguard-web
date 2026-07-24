import { TestBed } from '@angular/core/testing';
import type { OrganizationRoleOutput } from '@features/organization/models';
import { OrganizationRoleTable } from '../organization-role-table.component';

const role = (overrides: Partial<OrganizationRoleOutput> = {}): OrganizationRoleOutput =>
  ({
    '@id': '/api/organization-roles/role-1',
    '@type': 'OrganizationRole',
    id: 'role-1',
    organizationId: 'org-1',
    name: 'Administrator',
    description: 'Full access to the organization',
    isSystem: true,
    permissions: ['facilities.read', 'facilities.write'],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }) as OrganizationRoleOutput;

describe('OrganizationRoleTable', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [OrganizationRoleTable] });
  });

  const createFixture = (
    overrides: {
      roles?: readonly OrganizationRoleOutput[];
      loading?: boolean;
      canManage?: boolean;
      selectedRoleId?: string | null;
    } = {},
  ) => {
    const fixture = TestBed.createComponent(OrganizationRoleTable);
    fixture.componentRef.setInput('roles', overrides.roles ?? []);
    fixture.componentRef.setInput('loading', overrides.loading ?? false);
    fixture.componentRef.setInput('canManage', overrides.canManage ?? false);
    fixture.componentRef.setInput('selectedRoleId', overrides.selectedRoleId ?? null);
    fixture.detectChanges();
    return fixture;
  };

  it('should render skeleton placeholders while loading', () => {
    const fixture = createFixture({ loading: true });

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(host.querySelectorAll('li').length).toBe(3);
    expect(host.querySelector('p-skeleton')).toBeTruthy();
  });

  it('should render the empty state when there are no roles', () => {
    const fixture = createFixture({ roles: [] });

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('No roles yet');
  });

  it('should render a role card with name, description and permission count', () => {
    const fixture = createFixture({ roles: [role()] });

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('Administrator');
    expect(host.textContent).toContain('Full access to the organization');
    expect(host.textContent).toContain('(system)');
  });

  it('should render the fallback label when a role has no description', () => {
    const fixture = createFixture({ roles: [role({ description: null })] });

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('No description');
  });

  it('should not show the system label for a custom role', () => {
    const fixture = createFixture({ roles: [role({ isSystem: false })] });

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(host.textContent).not.toContain('(system)');
  });

  it('should mark the selected role card as current and show the check icon', () => {
    const fixture = createFixture({ roles: [role({ id: 'role-1' })], selectedRoleId: 'role-1' });

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    const button = host.querySelector('button');
    expect(button?.getAttribute('aria-current')).toBe('true');
    expect(host.querySelector('.pi-check-circle')).toBeTruthy();
  });

  it('should not mark an unselected role card as current', () => {
    const fixture = createFixture({ roles: [role({ id: 'role-1' })], selectedRoleId: 'role-2' });

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    const button = host.querySelector('button');
    expect(button?.getAttribute('aria-current')).toBeNull();
  });

  it('should show the manage affordance only when canManage is true', () => {
    const withManage = createFixture({ roles: [role()], canManage: true });
    expect((withManage.nativeElement as HTMLElement).textContent).toContain('Manage');

    const withoutManage = createFixture({ roles: [role()], canManage: false });
    expect((withoutManage.nativeElement as HTMLElement).textContent).not.toContain('Manage');
  });

  it('should emit select with the clicked role', () => {
    const fixture = createFixture({ roles: [role({ id: 'role-1' })] });
    const spy = vi.fn();
    fixture.componentInstance.select.subscribe(spy);

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    host.querySelector('button')?.click();

    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ id: 'role-1' }));
  });

  it('should pluralize the permission count for a single permission', () => {
    const fixture = createFixture({ roles: [role({ permissions: ['facilities.read'] })] });

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('1 permission');
    expect(host.textContent).not.toContain('1 permissions');
  });

  it('should pluralize the permission count for multiple permissions', () => {
    const fixture = createFixture({
      roles: [role({ permissions: ['facilities.read', 'facilities.write'] })],
    });

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('2 permissions');
  });

  it('should resolve the shield icon for a system role and id-card icon for a custom role', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;

    expect(component['roleIcon'](role({ isSystem: true }))).toBe('pi-shield');
    expect(component['roleIcon'](role({ isSystem: false }))).toBe('pi-id-card');
  });

  it('should render multiple role cards', () => {
    const fixture = createFixture({
      roles: [role({ id: 'role-1', name: 'Administrator' }), role({ id: 'role-2', name: 'Viewer' })],
    });

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(host.querySelectorAll('li').length).toBe(2);
    expect(host.textContent).toContain('Administrator');
    expect(host.textContent).toContain('Viewer');
  });
});
