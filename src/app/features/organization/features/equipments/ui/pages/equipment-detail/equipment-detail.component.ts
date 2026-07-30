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
  untracked,
  type WritableSignal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { TabsModule } from 'primeng/tabs';
import type { TabListPassThrough, TabPanelsPassThrough, TabsPassThrough } from 'primeng/types/tabs';
import { OrganizationPermissionService } from '@features/organization/access';
import {
  DETAIL_TAB_LIST_PT,
  DETAIL_TAB_PANELS_PT,
  DETAIL_TABS_PT,
} from '@features/organization/constants';
import type {
  AddAttachmentInput,
  EquipmentAttachmentOutput,
  EquipmentOutput,
  EquipmentTagOutput,
} from '@features/organization/features/equipments/models';
import {
  ActiveEquipmentStore,
  EquipmentStore,
} from '@features/organization/features/equipments/state';
import {
  EquipmentAssignmentPanel,
  EquipmentDetailHeader,
  EquipmentInformationPanel,
  EquipmentTagsPanel,
  type EquipmentFacilityOption,
} from '@features/organization/features/equipments/ui/components';
import {
  EquipmentAttachmentTable,
  EquipmentMaintenanceLogTable,
} from '@features/organization/features/equipments/ui/tables';
import type { FacilityOutput } from '@features/organization/features/facilities/models';
import { FacilityStore } from '@features/organization/features/facilities/state';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { EmptyState } from '@shared/empty-state';

/**
 * Page EquipmentDetailPage
 *
 * @description
 * Presents the active equipment and coordinates its assignment, lifecycle,
 * tags, attachments and maintenance log workflows.
 *
 * @since 1.0.0
 */
@Component({
  selector: 'app-equipment-detail',
  imports: [
    EquipmentAssignmentPanel,
    EquipmentAttachmentTable,
    EquipmentDetailHeader,
    EquipmentInformationPanel,
    EquipmentMaintenanceLogTable,
    EquipmentTagsPanel,
    ButtonModule,
    EmptyState,
    SkeletonModule,
    TabsModule,
  ],
  providers: [EquipmentStore, FacilityStore],
  templateUrl: './equipment-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EquipmentDetailPage {
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

  /** Router used by equipment detail actions. */
  private readonly router: Router = inject<Router>(Router);
  /** Active route used to build relative equipment routes. */
  private readonly route: ActivatedRoute = inject<ActivatedRoute>(ActivatedRoute);
  /** PrimeNG confirmation service for destructive operations. */
  private readonly confirmationService: ConfirmationService =
    inject<ConfirmationService>(
      ConfirmationService,
    ); /** Active equipment context store populated by the route resolver. */
  private readonly activeEquipmentStore: ActiveEquipmentStore =
    inject<ActiveEquipmentStore>(ActiveEquipmentStore);
  /** Organization permission evaluator. */
  private readonly permissionService: OrganizationPermissionService = inject(
    OrganizationPermissionService,
  );

  /** Page-scoped equipment workflow store. */
  protected readonly store: EquipmentStore = inject<EquipmentStore>(EquipmentStore);
  /** Page-scoped facility source used by the assignment panel. */
  protected readonly facilityStore: FacilityStore = inject<FacilityStore>(FacilityStore);
  /** Equipment currently selected by the route context. */
  protected readonly equipment: Signal<EquipmentOutput | null> = computed(() =>
    this.activeEquipmentStore.selectedEquipment(),
  );
  /** Whether the active member can mutate equipment. */
  protected readonly canManage: Signal<boolean> = computed(() =>
    this.permissionService.hasPermission(ORGANIZATION_PERMISSION.EQUIPMENT_WRITE),
  );
  /** Whether the active equipment is loading. */
  protected readonly isLoading: Signal<boolean> = computed(() =>
    this.activeEquipmentStore.isLoadingEquipment(),
  );
  /** Index of the selected detail tab. */
  protected readonly activeTab: WritableSignal<number> = signal(0);
  /** PrimeNG pass-through configuration for the tab container. */
  protected readonly tabsPt: TabsPassThrough = DETAIL_TABS_PT;
  /** PrimeNG pass-through configuration for the tab list. */
  protected readonly tabListPt: TabListPassThrough = DETAIL_TAB_LIST_PT;
  /** PrimeNG pass-through configuration for the tab panels. */
  protected readonly tabPanelsPt: TabPanelsPassThrough = DETAIL_TAB_PANELS_PT;
  /** Facilities mapped to assignment select options. */
  protected readonly facilityOptions: Signal<readonly EquipmentFacilityOption[]> = computed(() =>
    this.facilityStore.facilities().map((facility: FacilityOutput) => ({
      label: facility.name,
      value: facility.id,
    })),
  );

  /**
   * Initializes supporting equipment detail collections.
   */
  public constructor() {
    // An effect, not a constructor call: the routed input is only bound after
    // construction, and reading it here would throw NG0950.
    effect((): void => {
      const organizationId: string = this.organizationId();
      const equipmentId: string | undefined = this.equipment()?.id;

      if (!equipmentId) return;

      untracked((): void => {
        this.facilityStore.ensureParentOptionsLoaded(organizationId);
        this.store.loadAttachments({ organizationId, equipmentId });
        this.store.loadMaintenanceLogs({
          organizationId,
          equipmentId,
          options: { itemsPerPage: 30 },
        });
      });
    });
  }

  /** Navigates to the active equipment edit page. */
  protected onEdit(): void {
    this.router.navigate(['edit'], { relativeTo: this.route });
  }

  /**
   * Navigates back to the organization's equipment list, offered by the
   * not-found state so a failed or absent load never dead-ends.
   */
  protected navigateBack(): void {
    this.router.navigate(['/organizations', this.organizationId(), 'equipments']);
  }

  /** Assigns the active equipment to a facility. */
  protected assign(facilityId: string): void {
    this.run((organizationId, equipmentId) =>
      this.store.assignToFacility({ organizationId, equipmentId, input: { facilityId } }),
    );
  }

  /** Removes the active equipment facility assignment. */
  protected unassign(): void {
    this.run((organizationId, equipmentId) =>
      this.store.unassignFromFacility({ organizationId, equipmentId }),
    );
  }

  /** Opens the detail page of the equipment's currently assigned facility. */
  protected viewFacility(facilityId: string): void {
    this.router.navigate(['..', '..', 'facilities', facilityId], { relativeTo: this.route });
  }

  /** Moves the active equipment to its commissioned lifecycle state. */
  protected commission(): void {
    this.run((organizationId, equipmentId) =>
      this.store.commission({ organizationId, equipmentId }),
    );
  }

  /** Moves the active equipment to its maintenance lifecycle state. */
  protected maintenance(): void {
    this.run((organizationId, equipmentId) =>
      this.store.maintenance({ organizationId, equipmentId }),
    );
  }

  /** Confirms and permanently decommissions the active equipment. */
  protected decommission(): void {
    this.confirmationService.confirm({
      header: $localize`:@@equipment.decommissionConfirm.header:Decommission equipment`,
      message: $localize`:@@equipment.decommissionConfirm.message:This equipment will be marked as permanently out of service.`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: {
        label: $localize`:@@equipment.decommission:Decommission`,
        severity: 'danger',
      },
      rejectButtonProps: {
        label: $localize`:@@common.cancel:Cancel`,
        severity: 'secondary',
        outlined: true,
      },
      accept: () =>
        this.run((organizationId, equipmentId) =>
          this.store.decommission({ organizationId, equipmentId }),
        ),
    });
  }

  /** Adds a tag to the active equipment. */
  protected addTag(name: string): void {
    this.run((organizationId, equipmentId) =>
      this.store.addTag({ organizationId, equipmentId, input: { name } }),
    );
  }

  /** Removes a tag from the active equipment. */
  protected removeTag(tag: EquipmentTagOutput): void {
    this.run((organizationId, equipmentId) =>
      this.store.removeTag({ organizationId, equipmentId, tagId: tag.id }),
    );
  }

  /** Adds an attachment to the active equipment. */
  protected addAttachment(payload: AddAttachmentInput): void {
    this.run((organizationId, equipmentId) =>
      this.store.addAttachment({ organizationId, equipmentId, input: payload }),
    );
  }

  /** Confirms and deletes an equipment attachment. */
  protected deleteAttachment(attachment: EquipmentAttachmentOutput): void {
    this.confirmationService.confirm({
      header: $localize`:@@equipment.deleteAttachment.header:Delete attachment`,
      message: $localize`:@@equipment.deleteAttachment.message:Delete "${attachment.label || attachment.fileName}:name:"?`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: $localize`:@@common.delete:Delete`, severity: 'danger' },
      rejectButtonProps: {
        label: $localize`:@@common.cancel:Cancel`,
        severity: 'secondary',
        outlined: true,
      },
      accept: () =>
        this.run((organizationId, equipmentId) =>
          this.store.deleteAttachment({
            organizationId,
            equipmentId,
            attachmentId: attachment.id,
          }),
        ),
    });
  }

  /**
   * Runs an equipment operation when both route context identifiers exist.
   */
  private run(operation: (organizationId: string, equipmentId: string) => void): void {
    const equipmentId: string | undefined = this.equipment()?.id;

    if (equipmentId) operation(this.organizationId(), equipmentId);
  }
}
