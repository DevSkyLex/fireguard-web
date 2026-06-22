import { ChangeDetectionStrategy, Component, computed, inject, type Signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { SkeletonModule } from 'primeng/skeleton';
import { OrganizationPermissionService } from '@features/organization/access';
import type {
  ChecklistItemOutput,
  ChecklistOutput,
} from '@features/organization/features/checklists/models';
import {
  ActiveChecklistStore,
  ChecklistStore,
} from '@features/organization/features/checklists/state';
import { ChecklistDetailHeader } from '@features/organization/features/checklists/ui/components';
import { ChecklistItemTable } from '@features/organization/features/checklists/ui/tables';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { ActiveOrganizationStore } from '@features/organization/state';

/**
 * Read-only detail page for the active immutable checklist.
 */
@Component({
  selector: 'app-checklist-detail',
  imports: [ChecklistDetailHeader, ChecklistItemTable, SkeletonModule],
  providers: [ChecklistStore],
  templateUrl: './checklist-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChecklistDetailPage {
  /** Router used by checklist detail actions. */
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
  /** Active checklist context store populated by the route resolver. */
  private readonly activeChecklistStore: ActiveChecklistStore =
    inject<ActiveChecklistStore>(ActiveChecklistStore);

  /** Page-scoped checklist workflow store. */
  protected readonly store: ChecklistStore = inject<ChecklistStore>(ChecklistStore);
  /** Checklist currently selected by the route context. */
  protected readonly checklist: Signal<ChecklistOutput | null> = computed(() =>
    this.activeChecklistStore.selectedChecklist(),
  );
  /** Whether the active member can archive checklists. */
  protected readonly canManage: Signal<boolean> = computed(() =>
    this.permissionService.hasPermission(ORGANIZATION_PERMISSION.INSPECTION_WRITE),
  );
  /** Whether the active checklist is loading. */
  protected readonly isLoading: Signal<boolean> = computed(() =>
    this.activeChecklistStore.isLoadingChecklist(),
  );

  /** Confirms and archives the active checklist. */
  protected archive(): void {
    const checklist = this.checklist();
    if (!checklist) return;
    this.confirmationService.confirm({
      header: $localize`:@@checklist.archiveHeader:Archive checklist`,
      message: $localize`:@@checklist.archiveConfirm:Archive "${checklist.name}:name:"?`,
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

  /** Returns to the checklist list. */
  protected back(): void {
    this.router.navigate(['..'], { relativeTo: this.route });
  }

  /** Counts required items for the checklist summary. */
  protected requiredItemCount(items: readonly ChecklistItemOutput[]): number {
    return items.filter((item: ChecklistItemOutput): boolean => item.required).length;
  }
}
