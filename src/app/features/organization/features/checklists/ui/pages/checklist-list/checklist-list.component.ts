import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  numberAttribute,
  type InputSignalWithTransform,
  type Signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { OrganizationPermissionService } from '@features/organization/access';
import type {
  ChecklistListOptions,
  ChecklistOutput,
} from '@features/organization/features/checklists/models';
import { ChecklistStore } from '@features/organization/features/checklists/state';
import { ChecklistTable } from '@features/organization/features/checklists/ui/tables';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { ActiveOrganizationStore } from '@features/organization/state';

/**
 * Page coordinating checklist listing, navigation and archival.
 */
@Component({
  selector: 'app-checklist-list',
  imports: [ChecklistTable],
  providers: [ChecklistStore],
  templateUrl: './checklist-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChecklistListPage {
  /** Current page bound from the route query parameter. */
  public readonly page: InputSignalWithTransform<number, unknown> = input(1, {
    transform: (value: unknown): number => Math.max(1, numberAttribute(value, 1)),
  });

  /** Router used by checklist list actions. */
  private readonly router: Router = inject<Router>(Router);
  /** Active route used to build relative checklist routes. */
  private readonly route: ActivatedRoute = inject<ActivatedRoute>(ActivatedRoute);
  /** PrimeNG confirmation service used before archival. */
  private readonly confirmationService: ConfirmationService =
    inject<ConfirmationService>(ConfirmationService);
  /** Organization permission evaluator. */
  private readonly permissionService: OrganizationPermissionService = inject(
    OrganizationPermissionService,
  );
  /** Active organization context store. */
  private readonly activeOrganizationStore: ActiveOrganizationStore =
    inject<ActiveOrganizationStore>(ActiveOrganizationStore);

  /** Page-scoped checklist workflow store. */
  protected readonly store: ChecklistStore = inject<ChecklistStore>(ChecklistStore);
  /** Whether the active member can create and archive checklists. */
  protected readonly canManage: Signal<boolean> = computed(() =>
    this.permissionService.hasPermission(ORGANIZATION_PERMISSION.INSPECTION_WRITE),
  );

  /** Loads one checklist page for the active organization. */
  protected onLoad(options: ChecklistListOptions): void {
    const organizationId = this.activeOrganizationStore.selectedOrganization()?.id;
    if (organizationId) this.store.load({ organizationId, options });
  }

  /** Navigates to checklist creation. */
  protected onCreate(): void {
    this.router.navigate(['create'], { relativeTo: this.route });
  }

  /** Navigates to a checklist detail page. */
  protected onView(checklist: ChecklistOutput): void {
    this.router.navigate([checklist.id], { relativeTo: this.route });
  }

  /** Confirms and archives a checklist. */
  protected onArchive(checklist: ChecklistOutput): void {
    this.confirmationService.confirm({
      header: $localize`:@@checklist.archiveHeader:Archive checklist`,
      message: $localize`:@@checklist.archiveConfirmList:Archive "${checklist.name}:name:"? It will no longer be available for new inspections.`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: $localize`:@@common.archive:Archive`, severity: 'danger' },
      rejectButtonProps: {
        label: $localize`:@@common.cancel:Cancel`,
        severity: 'secondary',
        outlined: true,
      },
      accept: () => {
        const organizationId = this.activeOrganizationStore.selectedOrganization()?.id;
        if (organizationId) this.store.archive({ organizationId, checklistId: checklist.id });
      },
    });
  }

  /** Synchronizes the current page with the route query parameters. */
  protected onPageChange(page: number): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page: page > 1 ? page : null },
      queryParamsHandling: 'merge',
    });
  }
}
