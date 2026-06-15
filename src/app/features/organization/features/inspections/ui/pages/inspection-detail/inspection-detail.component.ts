import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { DialogModule } from 'primeng/dialog';
import { SkeletonModule } from 'primeng/skeleton';
import { TabsModule } from 'primeng/tabs';
import type { TabListPassThrough, TabPanelsPassThrough, TabsPassThrough } from 'primeng/types/tabs';
import { OrganizationPermissionService } from '@features/organization/access';
import type {
  InspectionOutput,
  NonConformityOutput,
} from '@features/organization/features/inspections/models';
import {
  ActiveInspectionStore,
  InspectionStore,
} from '@features/organization/features/inspections/state';
import {
  InspectionDetailHeader,
  InspectionInformationPanel,
} from '@features/organization/features/inspections/ui/components';
import type { NonConformityFormValues } from '@features/organization/features/inspections/ui/forms';
import {
  NonConformityTable,
  type NonConformityStatusChange,
} from '@features/organization/features/inspections/ui/tables';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { ActiveOrganizationStore } from '@features/organization/state';

/**
 * Page InspectionDetailPage
 *
 * @description
 * Presents the active inspection and coordinates its lifecycle and
 * non-conformity workflows.
 *
 * @since 1.0.0
 */
@Component({
  selector: 'app-inspection-detail',
  imports: [
    DialogModule,
    InspectionDetailHeader,
    InspectionInformationPanel,
    NonConformityTable,
    SkeletonModule,
    TabsModule,
  ],
  providers: [InspectionStore],
  templateUrl: './inspection-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InspectionDetailPage {
  /** Router used by inspection detail actions. */
  private readonly router: Router = inject(Router);
  /** Active route used to build relative inspection routes. */
  private readonly route: ActivatedRoute = inject(ActivatedRoute);
  /** PrimeNG confirmation service for destructive operations. */
  private readonly confirmationService: ConfirmationService = inject(ConfirmationService);
  /** Active organization context store. */
  private readonly activeOrganizationStore: ActiveOrganizationStore =
    inject(ActiveOrganizationStore);
  /** Active inspection context store populated by the route resolver. */
  private readonly activeInspectionStore: ActiveInspectionStore = inject(ActiveInspectionStore);
  /** Organization permission evaluator. */
  private readonly permissionService: OrganizationPermissionService = inject(
    OrganizationPermissionService,
  );

  /** Page-scoped inspection workflow store. */
  protected readonly store: InspectionStore = inject(InspectionStore);
  /** Inspection currently selected by the route context. */
  protected readonly inspection: Signal<InspectionOutput | null> = computed(() =>
    this.activeInspectionStore.selectedInspection(),
  );
  /** Whether the active member can mutate inspections. */
  protected readonly canManage: Signal<boolean> = computed(() =>
    this.permissionService.hasPermission(ORGANIZATION_PERMISSION.INSPECTION_WRITE),
  );
  /** Non-conformity selected for detail display. */
  protected readonly selectedNonConformity: WritableSignal<NonConformityOutput | null> =
    signal(null);
  /** Whether the active inspection is loading. */
  protected readonly isLoading: Signal<boolean> = computed(() =>
    this.activeInspectionStore.isLoadingInspection(),
  );
  /** Index of the selected detail tab. */
  protected readonly activeTab: WritableSignal<number> = signal(0);
  /** PrimeNG pass-through configuration for the tab container. */
  protected readonly tabsPt: TabsPassThrough = {
    root: { class: 'flex min-h-0 flex-1 flex-col' },
  };
  /** PrimeNG pass-through configuration for the tab list. */
  protected readonly tabListPt: TabListPassThrough = {
    content: { class: 'rounded-t-md' },
    tabList: { class: 'px-4' },
  };
  /** PrimeNG pass-through configuration for the tab panels. */
  protected readonly tabPanelsPt: TabPanelsPassThrough = {
    root: { class: 'min-h-0 flex-1 overflow-y-auto px-0 pt-6' },
  };

  /** Initializes the active inspection non-conformity collection. */
  public constructor() {
    this.run((organizationId, inspectionId) =>
      this.store.loadNonConformities({
        organizationId,
        inspectionId,
        options: { itemsPerPage: 30 },
      }),
    );
  }

  /** Navigates to the active inspection edit page. */
  protected onEdit(): void {
    this.router.navigate(['edit'], { relativeTo: this.route });
  }

  /** Submits the active draft inspection. */
  protected submit(): void {
    this.run((organizationId, inspectionId) => this.store.submit({ organizationId, inspectionId }));
  }

  /** Closes the active submitted inspection. */
  protected close(): void {
    this.run((organizationId, inspectionId) => this.store.close({ organizationId, inspectionId }));
  }

  /** Confirms and cancels the active draft inspection. */
  protected cancel(): void {
    this.confirmationService.confirm({
      header: 'Cancel inspection',
      message: 'Cancel this draft inspection? This action cannot be undone.',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: 'Cancel inspection', severity: 'danger' },
      rejectButtonProps: { label: 'Keep draft', severity: 'secondary', outlined: true },
      accept: () =>
        this.run((organizationId, inspectionId) => {
          this.store.cancel({ organizationId, inspectionId });
          this.router.navigate(['..'], { relativeTo: this.route });
        }),
    });
  }

  /** Adds a non-conformity to the active inspection. */
  protected addNonConformity(values: NonConformityFormValues): void {
    this.run((organizationId, inspectionId) =>
      this.store.addNonConformity({
        organizationId,
        inspectionId,
        input: {
          description: values.description,
          severity: values.severity,
          dueAt: values.dueAt?.toISOString() ?? null,
          notes: values.notes || null,
        },
      }),
    );
  }

  /** Updates a non-conformity status. */
  protected updateStatus(change: NonConformityStatusChange): void {
    this.run((organizationId, inspectionId) =>
      this.store.updateNonConformityStatus({
        organizationId,
        inspectionId,
        nonConformityId: change.nonConformity.id,
        input: { status: change.status },
      }),
    );
  }

  /** Selects and refreshes a non-conformity detail. */
  protected viewNonConformity(nonConformity: NonConformityOutput): void {
    this.selectedNonConformity.set(nonConformity);
    this.run((organizationId, inspectionId) =>
      this.store.loadNonConformity({
        organizationId,
        inspectionId,
        nonConformityId: nonConformity.id,
      }),
    );
  }

  /**
   * Runs an inspection operation when both route context identifiers exist.
   */
  private run(operation: (organizationId: string, inspectionId: string) => void): void {
    const organizationId = this.activeOrganizationStore.selectedOrganization()?.id;
    const inspectionId = this.inspection()?.id;
    if (organizationId && inspectionId) operation(organizationId, inspectionId);
  }
}
