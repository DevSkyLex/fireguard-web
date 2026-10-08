import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';
import { OrganizationPermissionService } from '@features/organization/access';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { OrganizationMemberAccessStore } from '@features/organization/state';
import { OrganizationLandingService } from '../organization-landing.service';

describe('OrganizationLandingService', () => {
  let ensureAccessResolved: ReturnType<typeof vi.fn>;
  let canAccessOrganization: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    ensureAccessResolved = vi.fn().mockReturnValue(of(true));
    canAccessOrganization = vi.fn().mockReturnValue(true);
    TestBed.configureTestingModule({
      providers: [
        OrganizationLandingService,
        { provide: OrganizationMemberAccessStore, useValue: { ensureAccessResolved } },
        { provide: OrganizationPermissionService, useValue: { canAccessOrganization } },
      ],
    });
  });

  it('uses only API-confirmed facilities permission for the target organization', async () => {
    const destination = await firstValueFrom(
      TestBed.inject(OrganizationLandingService).defaultDestination('org-selected'),
    );
    expect(ensureAccessResolved).toHaveBeenCalledWith('org-selected');
    expect(canAccessOrganization).toHaveBeenCalledWith('org-selected', [
      ORGANIZATION_PERMISSION.FACILITIES_READ,
    ]);
    expect(destination).toBe('/organizations/org-selected/assets');
  });

  it('keeps the dashboard fallback when the target member cannot read facilities', async () => {
    canAccessOrganization.mockReturnValue(false);
    expect(
      await firstValueFrom(
        TestBed.inject(OrganizationLandingService).defaultDestination('org-selected'),
      ),
    ).toBe('/organizations/org-selected');
  });

  it('never reuses another organization permissions when target access is unresolved', async () => {
    ensureAccessResolved.mockReturnValue(of(false));
    expect(
      await firstValueFrom(
        TestBed.inject(OrganizationLandingService).defaultDestination('org-selected'),
      ),
    ).toBe('/organizations/org-selected');
    expect(canAccessOrganization).not.toHaveBeenCalled();
  });
});
