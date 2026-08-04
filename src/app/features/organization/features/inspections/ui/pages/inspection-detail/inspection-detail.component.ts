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
import { DialogModule } from 'primeng/dialog';
import { SkeletonModule } from 'primeng/skeleton';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import type { TabListPassThrough, TabPanelsPassThrough, TabsPassThrough } from 'primeng/types/tabs';
import type { StoreError } from '@core/request-state';
import { OrganizationPermissionService } from '@features/organization/access';
import {
  DETAIL_TAB_LIST_PT,
  DETAIL_TAB_PANELS_PT,
  DETAIL_TABS_PT,
} from '@features/organization/constants';
import { ChecklistStore } from '@features/organization/features/checklists/state';
import { EquipmentStore } from '@features/organization/features/equipments/state';
import { FacilityStore } from '@features/organization/features/facilities/state';
import {
  resolveInspectionTag,
  type InspectionOutput,
  type NonConformityOutput,
  type UpdateInspectionInput,
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
import { EmptyState } from '@shared/empty-state';
import { DIALOG_BREAKPOINTS, DIALOG_WIDTH_LG } from '@shared/overlay-size';
import { type TagDescriptor } from '@shared/tag';

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
    TabsModule,
    TagModule,
  ],
  providers: [InspectionStore, EquipmentStore, FacilityStore, ChecklistStore],
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
  /**
   * Property equipmentStore
   * @readonly
   *
   * @description
   * Source of the equipment picker's options, loaded only once a relation is
   * opened for editing.
   *
   * @access private
   * @since 2.1.0
   *
   * @type {EquipmentStore}
   */
  private readonly equipmentStore: EquipmentStore = inject<EquipmentStore>(EquipmentStore);

  /**
   * Property facilityStore
   * @readonly
   *
   * @description
   * Source of the site picker's options.
   *
   * @access private
   * @since 2.1.0
   *
   * @type {FacilityStore}
   */
  private readonly facilityStore: FacilityStore = inject<FacilityStore>(FacilityStore);

  /**
   * Property checklistStore
   * @readonly
   *
   * @description
   * Source of the checklist picker's options.
   *
   * @access private
   * @since 2.1.0
   *
   * @type {ChecklistStore}
   */
  private readonly checklistStore: ChecklistStore = inject<ChecklistStore>(ChecklistStore);

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

  /**
   * Property canEditFields
   * @readonly
   *
   * @description
   * Whether the information panel's writable properties may be opened:
   * write permission and the record's own lifecycle gate — only a draft
   * inspection can be edited (`FEATURE.md` invariants), mirrored from the
   * retired edit route's own status check.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canEditFields: Signal<boolean> = computed<boolean>(
    () => this.canManage() && this.inspection()?.status === 'draft',
  );

  /**
   * Property updateErrorMessage
   * @readonly
   *
   * @description
   * Human message for a failed in-place save, shown under the field that
   * produced it.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {Signal<string | null>}
   */
  protected readonly updateErrorMessage: Signal<string | null> = computed<string | null>(() => {
    const error: StoreError | null = this.store.updateError();
    if (!error) return null;

    return (
      error.message ?? $localize`:@@inspection.info.saveFailed:This change could not be saved.`
    );
  });

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
  /** Canonical `p-dialog` width for the non-conformity detail dialog. */
  protected readonly dialogWidth: string = DIALOG_WIDTH_LG;
  /** Canonical `p-dialog` responsive breakpoints (DESIGN.md, "Overlays — sizes"). */
  protected readonly dialogBreakpoints: Record<string, string> = DIALOG_BREAKPOINTS;

  /** Initializes the active inspection non-conformity collection. */
  public constructor() {
    // An effect, not a constructor call: the routed input is only bound after
    // construction, and reading it here would throw NG0950. The store call is
    // untracked so its pending patches cannot re-trigger the effect.
    effect(() => {
      this.run((organizationId, inspectionId) =>
        untracked((): void => {
          this.store.loadNonConformities({
            organizationId,
            inspectionId,
            options: { itemsPerPage: 30 },
          });
        }),
      );
    });

    // Leave the detail page only once the cancellation has actually succeeded
    // (the store is page-scoped, so its call state starts idle). Navigating
    // eagerly would strand the user on the list even if the cancel failed.
    effect(() => {
      if ('success' === this.store.cancelCallState().status) {
        this.router.navigate(['..'], { relativeTo: this.route });
      }
    });
  }

  /**
   * Property equipmentOptions
   * @readonly
   *
   * @description
   * Equipment as the picker wants it. Empty until a relation is opened.
   *
   * @access protected
   * @since 1.2.0
   *
   * @type {Signal<readonly { label: string; value: string }[]>}
   */
  protected readonly equipmentOptions: Signal<readonly { label: string; value: string }[]> =
    computed(() =>
      this.equipmentStore.equipmentList().map((equipment) => ({
        label: equipment.serialNumber ?? equipment.id,
        value: equipment.id,
      })),
    );

  /**
   * Property facilityOptions
   * @readonly
   *
   * @description
   * Sites as the picker wants them.
   *
   * @access protected
   * @since 1.2.0
   *
   * @type {Signal<readonly { label: string; value: string }[]>}
   */
  protected readonly facilityOptions: Signal<readonly { label: string; value: string }[]> =
    computed(() =>
      this.facilityStore.facilities().map((facility) => ({
        label: facility.name,
        value: facility.id,
      })),
    );

  /**
   * Property checklistOptions
   * @readonly
   *
   * @description
   * Checklists as the picker wants them.
   *
   * @access protected
   * @since 1.2.0
   *
   * @type {Signal<readonly { label: string; value: string }[]>}
   */
  protected readonly checklistOptions: Signal<readonly { label: string; value: string }[]> =
    computed(() =>
      this.checklistStore.checklists().map((checklist) => ({
        label: checklist.name,
        value: checklist.id,
      })),
    );

  /**
   * Method onOptionsNeeded
   * @method onOptionsNeeded
   *
   * @description
   * Loads the three relation pickers' options, the first time one is opened.
   *
   * Lazy on purpose: reading a record is the common case and must not pay for
   * three option queries only the pickers need. The store methods are
   * idempotent, so repeated opens cost nothing.
   *
   * @access protected
   * @since 1.2.0
   *
   * @returns {void}
   */
  protected onOptionsNeeded(): void {
    const organizationId: string = this.organizationId();

    this.equipmentStore.ensureInspectionCreateOptionsLoaded(organizationId);
    this.facilityStore.ensureParentOptionsLoaded(organizationId);
    this.checklistStore.ensureInspectionCreateOptionsLoaded(organizationId);
  }

  /**
   * Method onFieldChanged
   * @method onFieldChanged
   *
   * @description
   * Persists one property confirmed in place. The panel owns the draft and
   * the cancel path; the page owns the call and the draft-only edit gate
   * (ARCHITECTURE.md §10.5).
   *
   * @access protected
   * @since 1.1.0
   *
   * @param {UpdateInspectionInput} patch - Patch for the changed property.
   * @returns {void}
   */
  protected onFieldChanged(patch: UpdateInspectionInput): void {
    const inspectionId: string | undefined = this.inspection()?.id;
    if (!inspectionId) return;

    this.store.update({ organizationId: this.organizationId(), inspectionId, input: patch });
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
