import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  type InputSignal,
  type Signal,
  signal,
  type WritableSignal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SkeletonModule } from 'primeng/skeleton';
import { TabsModule } from 'primeng/tabs';
import type { TabListPassThrough, TabPanelsPassThrough, TabsPassThrough } from 'primeng/types/tabs';
import { OrganizationPermissionService } from '@features/organization/access';
import {
  DETAIL_TAB_LIST_PT,
  DETAIL_TAB_PANELS_PT,
  DETAIL_TABS_PT,
} from '@features/organization/constants';
import {
  resolveInspectionTag,
  type InspectionOutput,
  type NonConformityOutput,
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
import { EmptyState, Tag, type TagDescriptor } from '@shared/components';

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
    ButtonModule,
    DialogModule,
    EmptyState,
    InspectionDetailHeader,
    InspectionInformationPanel,
    NonConformityTable,
    SkeletonModule,
    Tag,
    TabsModule,
  ],
  providers: [InspectionStore],
  templateUrl: './inspection-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InspectionDetailPage {
  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Routed organization, bound from `:organizationId` by the router. The
   * parameter — not the store — is the source of truth: a page rendered under
   * this segment is, by construction, scoped to that organization.
   *
   * @access public
   * @since 1.1.0
   *
   * @type {InputSignal<string>}
   */
  public readonly organizationId: InputSignal<string> = input.required<string>();

  /** Router used by inspection detail actions. */
  private readonly router: Router = inject<Router>(Router);
  /** Active route used to build relative inspection routes. */
  private readonly route: ActivatedRoute = inject<ActivatedRoute>(ActivatedRoute);
  /** PrimeNG confirmation service for destructive operations. */
  private readonly confirmationService: ConfirmationService =
    inject<ConfirmationService>(
      ConfirmationService,
    ); /** Active inspection context store populated by the route resolver. */
  private readonly activeInspectionStore: ActiveInspectionStore =
    inject<ActiveInspectionStore>(ActiveInspectionStore);
  /** Organization permission evaluator. */
  private readonly permissionService: OrganizationPermissionService = inject(
    OrganizationPermissionService,
  );

  /** Page-scoped inspection workflow store. */
  protected readonly store: InspectionStore = inject<InspectionStore>(InspectionStore);
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
  /** Localized placeholder shown when no notes are recorded. */
  protected readonly noNotesLabel: string = $localize`:@@inspection.info.noNotes:No notes`;
  /** Whether the active inspection is loading. */
  protected readonly isLoading: Signal<boolean> = computed(() =>
    this.activeInspectionStore.isLoadingInspection(),
  );
  /** Index of the selected detail tab. */
  protected readonly activeTab: WritableSignal<number> = signal(0);
  /** PrimeNG pass-through configuration for the tab container. */
  protected readonly tabsPt: TabsPassThrough = DETAIL_TABS_PT;
  /** PrimeNG pass-through configuration for the tab list. */
  protected readonly tabListPt: TabListPassThrough = DETAIL_TAB_LIST_PT;
  /** PrimeNG pass-through configuration for the tab panels. */
  protected readonly tabPanelsPt: TabPanelsPassThrough = DETAIL_TAB_PANELS_PT;

  /** Initializes the active inspection non-conformity collection. */
  public constructor() {
    this.run((organizationId, inspectionId) =>
      this.store.loadNonConformities({
        organizationId,
        inspectionId,
        options: { itemsPerPage: 30 },
      }),
    );

    // Leave the detail page only once the cancellation has actually succeeded
    // (the store is page-scoped, so its call state starts idle). Navigating
    // eagerly would strand the user on the list even if the cancel failed.
    effect(() => {
      if ('success' === this.store.cancelCallState().status) {
        this.router.navigate(['..'], { relativeTo: this.route });
      }
    });
  }

  /** Navigates to the active inspection edit page. */
  protected onEdit(): void {
    this.router.navigate(['edit'], { relativeTo: this.route });
  }

  /** Navigates back to the inspection list. */
  protected navigateBack(): void {
    this.router.navigate(['..'], { relativeTo: this.route });
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
      header: $localize`:@@inspection.cancel.header:Cancel inspection`,
      message: $localize`:@@inspection.cancel.messageLong:Cancel this draft inspection? This action cannot be undone.`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: {
        label: $localize`:@@inspection.cancel.accept:Cancel inspection`,
        severity: 'danger',
      },
      rejectButtonProps: {
        label: $localize`:@@inspection.cancel.reject:Keep draft`,
        severity: 'secondary',
        outlined: true,
      },
      accept: () =>
        this.run((organizationId, inspectionId) => {
          this.store.cancel({ organizationId, inspectionId });
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
    const inspectionId: string | undefined = this.inspection()?.id;

    if (inspectionId) operation(this.organizationId(), inspectionId);
  }

  /** Resolves the severity badge descriptor for the non-conformity dialog. */
  protected severityDescriptor(severity: string): TagDescriptor {
    return resolveInspectionTag('nonConformitySeverity', severity);
  }

  /** Resolves the status badge descriptor for the non-conformity dialog. */
  protected statusDescriptor(status: string): TagDescriptor {
    return resolveInspectionTag('nonConformityStatus', status);
  }
}
