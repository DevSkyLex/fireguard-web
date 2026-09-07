import { HttpErrorResponse } from '@angular/common/http';
import { toStoreError } from '@core/request-state';
import { organizationAccessErrorMessage } from '../organization-access-error.utils';
describe('organizationAccessErrorMessage', () => {
  it('maps direct problem codes and HttpErrorResponse bodies', () => {
    const direct = toStoreError({ code: 'organization_join_role_ineligible' });
    expect(organizationAccessErrorMessage(direct)).toContain('not eligible');
    const nested = toStoreError(
      new HttpErrorResponse({ status: 400, error: { code: 'organization_join_domain_generic' } }),
    );
    expect(organizationAccessErrorMessage(nested)).toContain('Public or disposable');
  });
  it('does not expose arbitrary internal error text or classify every conflict as quota', () => {
    expect(
      organizationAccessErrorMessage(toStoreError(new Error('SQL secret database error'))),
    ).toBe('Could not complete this request. Try again.');
    expect(
      organizationAccessErrorMessage(
        toStoreError(new HttpErrorResponse({ status: 409, error: { code: 'unknown' } })),
      ),
    ).toBe('Could not complete this request. Try again.');
  });
  it('handles absence and permission failures', () => {
    expect(organizationAccessErrorMessage(null)).toBeNull();
    expect(
      organizationAccessErrorMessage(toStoreError(new HttpErrorResponse({ status: 403 }))),
    ).toContain('permission');
  });
});
