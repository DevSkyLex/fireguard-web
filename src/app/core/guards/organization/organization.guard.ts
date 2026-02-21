import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';
import { map, catchError, of } from 'rxjs';
import { OrganizationService } from '@core/services/api/organization';

export const organizationGuard: CanActivateFn = () => {
  const organizationService: OrganizationService = inject<OrganizationService>(OrganizationService);
  const router: Router = inject<Router>(Router);

  return organizationService.list({ page: 1, itemsPerPage: 1 }).pipe(
    map((response) => {
      if (response.totalItems > 0) return true;
      return router.createUrlTree(['/onboarding']);
    }),
    catchError(() => of(router.createUrlTree(['/onboarding']))),
  );
};
