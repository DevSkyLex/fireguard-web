import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  signal,
  type InputSignal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import type { RequestOptions } from '@core/services/hydra-api';
import type {
  InspectionListOptions,
  InspectionResult,
  InspectionStatus,
} from '@features/organization/features/inspections/models';
import { InspectionStore } from '@features/organization/features/inspections/state';
import { InspectionTable } from '@features/organization/features/inspections/ui/tables';
import { ActiveOrganizationStore } from '@features/organization/state';

/**
 * Component FacilityInspectionTab
 * @class FacilityInspectionTab
 *
 * @description
 * Tab content component that displays inspections associated
 * with a facility. Provides its own {@link InspectionStore}
 * instance and loads inspections filtered by the given
 * `facilityId`.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-facility-inspection-tab',
  imports: [InspectionTable],
  providers: [InspectionStore],
  templateUrl: './facility-inspection-tab.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacilityInspectionTab {
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
  public readonly facilityId: InputSignal<string> = input.required<string>();
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
    this.router.navigate(['..', '..', 'inspections', 'create'], {
      relativeTo: this.route,
      queryParams: { facilityId: this.facilityId() },
    });
  }

  protected onLoad(options: RequestOptions): void {
    const organizationId: string | undefined =
      this.activeOrganizationStore.selectedOrganization()?.id;
    const facilityId: string = this.facilityId();
    const result: InspectionResult | undefined =
      typeof options.params?.['result'] === 'string'
        ? (options.params['result'] as InspectionResult)
        : undefined;
    const status: InspectionStatus | undefined =
      typeof options.params?.['status'] === 'string'
        ? (options.params['status'] as InspectionStatus)
        : undefined;

    if (organizationId && facilityId) {
      const listOptions: InspectionListOptions = {
        page: options.page,
        itemsPerPage: options.itemsPerPage,
        facilityId,
        params: this.getPassthroughParams(options),
        ...(result ? { result } : {}),
        ...(status ? { status } : {}),
      };

      this.store.load({
        organizationId,
        options: listOptions,
      });
    }
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
