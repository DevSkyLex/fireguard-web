import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  PLATFORM_ID,
  signal,
  type InputSignal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import type { RequestOptions } from '@core/api';
import { FacilityInspectionTable } from '@features/organization/features/facilities/ui/tables';
import type {
  InspectionListOptions,
  InspectionOutput,
  InspectionResult,
  InspectionStatus,
} from '@features/organization/features/inspections/models';
import { InspectionStore } from '@features/organization/features/inspections/state';
import { ActiveOrganizationStore } from '@features/organization/state';

/**
 * Component AssetInspectionTab
 * @class AssetInspectionTab
 *
 * @description
 * Tab content component that displays inspections associated
 * with a facility. Provides its own {@link InspectionStore}
 * instance and loads inspections filtered by the given
 * `facilityId`, or across the whole organization when none is given.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-asset-inspection-tab',
  imports: [FacilityInspectionTable],
  providers: [InspectionStore],
  templateUrl: './asset-inspection-tab.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssetInspectionTab {
  //#region Inputs
  /**
   * Input facilityId
   * @readonly
   *
   * @description
   * The facility ID to filter inspections by.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly facilityId: InputSignal<string | undefined> = input<string>();
  //#endregion

  //#region Properties
  /**
   * Property activeOrganizationStore
   * @readonly
   *
   * @description
   * Root-scoped store providing the current organization context.
   * Used to obtain the `organizationId` required by the store load.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {ActiveOrganizationStore}
   */
  private readonly activeOrganizationStore: ActiveOrganizationStore =
    inject<ActiveOrganizationStore>(ActiveOrganizationStore);

  private readonly router: Router = inject<Router>(Router);

  private readonly route: ActivatedRoute = inject<ActivatedRoute>(ActivatedRoute);

  private readonly confirmationService: ConfirmationService =
    inject<ConfirmationService>(ConfirmationService);

  private readonly platformId: object = inject<object>(PLATFORM_ID);

  /**
   * Property store
   * @readonly
   *
   * @description
   * Component-scoped InspectionStore instance. Provided at this
   * component level so its lifecycle is tied to the tab's lifetime.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {InspectionStore}
   */
  protected readonly store: InspectionStore = inject<InspectionStore>(InspectionStore);

  protected readonly page = signal<number>(1);
  //#endregion

  //#region Methods
  protected onAdd(): void {
    const facilityId: string | undefined = this.facilityId();

    void this.router.navigate(this.inspectionPath('create'), {
      queryParams: facilityId ? { facilityId } : undefined,
    });
  }

  protected onView(inspection: InspectionOutput): void {
    void this.router.navigate(this.inspectionPath(inspection.id));
  }

  protected onEdit(inspection: InspectionOutput): void {
    void this.router.navigate(this.inspectionPath(inspection.id, 'edit'));
  }

  /**
   * Method inspectionPath
   *
   * @description
   * Absolute path into the inspections subfeature.
   *
   * Absolute on purpose: this pane is hosted both by the facility record, two
   * segments deep, and by the assets explorer, one — a relative `../..` meant
   * the right destination from one host and a dead URL from the other.
   *
   * @access private
   * @since 2.0.0
   *
   * @param {...string} segments - Segments below `inspections`.
   * @returns {readonly string[]} Router commands.
   */
  private inspectionPath(...segments: readonly string[]): readonly string[] {
    const organizationId: string | null = this.activeOrganizationStore.selectedOrganizationId();

    return ['/organizations', organizationId ?? '', 'inspections', ...segments];
  }

  protected onCancel(inspection: InspectionOutput): void {
    const organizationId: string | null = this.activeOrganizationStore.selectedOrganizationId();
    if (!organizationId || inspection.status !== 'draft') return;

    this.confirmationService.confirm({
      header: $localize`:@@facility.cancelInspection.header:Cancel inspection`,
      message: $localize`:@@facility.cancelInspection.message:Cancel this draft inspection?`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: {
        label: $localize`:@@facility.cancelInspection.accept:Cancel inspection`,
        severity: 'danger',
      },
      rejectButtonProps: {
        label: $localize`:@@facility.cancelInspection.reject:Keep draft`,
        severity: 'secondary',
        outlined: true,
      },
      accept: () => this.store.cancel({ organizationId, inspectionId: inspection.id }),
    });
  }

  protected onLoad(options: RequestOptions): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const organizationId: string | null = this.activeOrganizationStore.selectedOrganizationId();
    const facilityId: string | undefined = this.facilityId();
    const result: InspectionResult | undefined =
      typeof options.params?.['result'] === 'string'
        ? (options.params['result'] as InspectionResult)
        : undefined;
    const status: InspectionStatus | undefined =
      typeof options.params?.['status'] === 'string'
        ? (options.params['status'] as InspectionStatus)
        : undefined;

    if (!organizationId) return;

    const listOptions: InspectionListOptions = {
      page: options.page,
      itemsPerPage: options.itemsPerPage,
      params: this.getPassthroughParams(options),
      ...(facilityId ? { facilityId } : {}),
      ...(result ? { result } : {}),
      ...(status ? { status } : {}),
    };

    this.store.load({ organizationId, options: listOptions });
  }

  protected onPageChange(page: number): void {
    this.page.set(page);
  }

  private getPassthroughParams(options: RequestOptions): RequestOptions['params'] {
    const params: RequestOptions['params'] = {};

    for (const [key, value] of Object.entries(options.params ?? {})) {
      if (key.startsWith('order[')) {
        params[key] = value;
      }
    }

    return params;
  }
  //#endregion
}
