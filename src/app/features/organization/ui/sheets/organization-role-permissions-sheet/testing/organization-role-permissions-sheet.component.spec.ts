import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type {
  OrganizationPermissionOutput,
  OrganizationRoleOutput,
} from '@features/organization/models';
import { OrganizationRolePermissionsSheet } from '../organization-role-permissions-sheet.component';

/**
 * Builds a role fixture. `permissions` is taken as plain names for readability
 * and expanded to the `{ name, description }` entries the API actually emits.
 */
function role(
  overrides: Partial<Omit<OrganizationRoleOutput, 'permissions'>> & {
    permissions?: readonly string[];
  } = {},
): OrganizationRoleOutput {
  const { permissions = ['organization.inspection.read'], ...rest } = overrides;

  return {
    id: 'role-1',
    organizationId: 'org-1',
    name: 'Inspector',
    description: null,
    isSystem: false,
    permissions: permissions.map((name: string) => ({ name, description: '' })),
    createdAt: '2026-01-01T00:00:00+00:00',
    updatedAt: '2026-01-01T00:00:00+00:00',
    ...rest,
  } as unknown as OrganizationRoleOutput;
}

function permission(name: string): OrganizationPermissionOutput {
  return { id: name, name, description: null } as unknown as OrganizationPermissionOutput;
}

const panel = (): HTMLElement | null =>
  document.querySelector('[data-testid="organization-role-permissions-sheet"]');

const checkboxFor = (name: string): HTMLElement | null =>
  Array.from(panel()?.querySelectorAll('[data-testid="organization-role-permission"]') ?? [])
    .find((el) => el.parentElement?.textContent?.includes(name))
    ?.querySelector('[role="checkbox"]') as HTMLElement | null;

describe('OrganizationRolePermissionsSheet', () => {
  let fixture: ComponentFixture<OrganizationRolePermissionsSheet>;
  let emitted: ReadonlyArray<string>[];

  async function open(target: OrganizationRoleOutput): Promise<void> {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(OrganizationRolePermissionsSheet);
    fixture.componentRef.setInput('role', target);
    fixture.componentRef.setInput('catalog', [
      permission('organization.inspection.read'),
      permission('organization.inspection.write'),
    ]);
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();

    emitted = [];
    fixture.componentInstance.permissionsChanged.subscribe((next) => emitted.push(next));
  }

  afterEach(() => TestBed.resetTestingModule());

  it('should render nothing until the page opens it', async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    fixture = TestBed.createComponent(OrganizationRolePermissionsSheet);
    await fixture.whenStable();

    expect(panel()).toBeNull();
  });

  it('should name the role being edited', async () => {
    await open(role({ name: 'Senior Inspector' }));

    expect(panel()?.textContent).toContain('Senior Inspector');
  });

  it('should render a system role read-only and refuse a toggle', async () => {
    await open(role({ isSystem: true, permissions: ['organization.inspection.read'] }));

    expect(panel()?.textContent).toContain('fixed and cannot be edited');

    checkboxFor('organization.inspection.write')?.dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    );
    await fixture.whenStable();

    expect(emitted).toEqual([]);
  });

  it('should add a permission to the next full list when an unchecked box is toggled on', async () => {
    await open(role({ permissions: ['organization.inspection.read'] }));

    checkboxFor('organization.inspection.write')?.dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    );
    await fixture.whenStable();

    expect(emitted).toEqual([['organization.inspection.read', 'organization.inspection.write']]);
  });

  it('should remove a permission from the next full list when a checked box is toggled off', async () => {
    await open(
      role({
        permissions: ['organization.inspection.read', 'organization.inspection.write'],
      }),
    );

    checkboxFor('organization.inspection.read')?.dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    );
    await fixture.whenStable();

    expect(emitted).toEqual([['organization.inspection.write']]);
  });

  it('should lock the checklist while a write is pending, even for a custom role', async () => {
    await open(role({ permissions: [] }));
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();

    checkboxFor('organization.inspection.read')?.dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    );
    await fixture.whenStable();

    expect(emitted).toEqual([]);
  });

  it('should surface a violation the API reported against an unrendered field', async () => {
    await open(role());
    fixture.componentRef.setInput('serverError', {
      status: 422,
      violations: [{ propertyPath: 'permissions', message: 'Too many permissions requested.' }],
    });
    await fixture.whenStable();

    expect(
      panel()?.querySelector('[data-testid="organization-role-permissions-error"]')?.textContent,
    ).toContain('Too many permissions requested.');
  });

  it('should fall back to a generic message when the rejection carries no violations', async () => {
    await open(role());
    fixture.componentRef.setInput('serverError', new Error('network down'));
    await fixture.whenStable();

    expect(
      panel()?.querySelector('[data-testid="organization-role-permissions-error"]')?.textContent,
    ).toContain("The role's permissions could not be updated.");
  });
});
