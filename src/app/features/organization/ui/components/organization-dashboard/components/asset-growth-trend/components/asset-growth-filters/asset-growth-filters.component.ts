import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  type Signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { OrganizationDashboardAssetGrowthStore } from '@features/organization/state/organization-dashboard';
import { TrendBaseFiltersForm } from '@features/organization/ui/components/organization-dashboard/forms';
import type {
  EquipmentStatusOption,
  EquipmentTypeOption,
  FacilityTypeOption,
} from '@features/organization/ui/components/organization-dashboard/models';
import {
  EQUIPMENT_STATUS_OPTIONS,
  EQUIPMENT_TYPE_OPTIONS,
  FACILITY_TYPE_OPTIONS,
} from '@features/organization/ui/components/organization-dashboard/options';
import { Tag } from '@shared/components';

/**
 * Type AssetGrowthFiltersForm
 *
 * @description
 * Typed reactive controls used by the asset-growth draft filter form.
 *
 * @since 2.1.0
 */
type AssetGrowthFiltersForm = {
  equipmentType: FormControl<EquipmentTypeOption['value'] | null>;
  equipmentStatus: FormControl<EquipmentStatusOption['value'] | null>;
  facilityType: FormControl<FacilityTypeOption['value'] | null>;
};

/**
 * Component AssetGrowthFilters
 * @class AssetGrowthFilters
 *
 * @description
 * Drawer filter form for the asset-growth trend card.
 * All draft filter state is read and mutated directly through
 * {@link OrganizationDashboardAssetGrowthStore}.
 *
 * @version 2.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-asset-growth-filters',
  templateUrl: './asset-growth-filters.component.html',
  imports: [ReactiveFormsModule, SelectModule, Tag, TrendBaseFiltersForm],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssetGrowthFilters {
  //#region Properties

  /**
   * Property store
   * @readonly
   *
   * @description
   * Component-scoped store used to read and mutate all draft filter selections.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {OrganizationDashboardAssetGrowthStore}
   */
  protected readonly store: OrganizationDashboardAssetGrowthStore =
    inject<OrganizationDashboardAssetGrowthStore>(OrganizationDashboardAssetGrowthStore);

  /**
   * Property form
   * @readonly
   *
   * @description
   * Typed reactive form group for asset-growth-specific draft filters.
   *
   * @access protected
   * @since 2.1.0
   *
   * @type {FormGroup<AssetGrowthFiltersForm>}
   */
  protected readonly form: FormGroup<AssetGrowthFiltersForm> =
    new FormGroup<AssetGrowthFiltersForm>({
      equipmentType: new FormControl<EquipmentTypeOption['value'] | null>(null),
      equipmentStatus: new FormControl<EquipmentStatusOption['value'] | null>(null),
      facilityType: new FormControl<FacilityTypeOption['value'] | null>(null),
    });

  /**
   * Property equipmentTypeOptions
   * @readonly
   *
   * @description
   * Available equipment-type filter options (plain labels, no icon/color).
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {EquipmentTypeOption[]}
   */
  protected readonly equipmentTypeOptions: EquipmentTypeOption[] = [...EQUIPMENT_TYPE_OPTIONS];

  /**
   * Property equipmentStatusOptions
   * @readonly
   *
   * @description
   * Available equipment-status filter options (icon + color).
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {EquipmentStatusOption[]}
   */
  protected readonly equipmentStatusOptions: EquipmentStatusOption[] = [
    ...EQUIPMENT_STATUS_OPTIONS,
  ];

  /**
   * Property facilityTypeOptions
   * @readonly
   *
   * @description
   * Available facility-type filter options (icon only, no color).
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {FacilityTypeOption[]}
   */
  protected readonly facilityTypeOptions: FacilityTypeOption[] = [...FACILITY_TYPE_OPTIONS];

  /**
   * Property selectedEquipmentStatusOption
   * @readonly
   *
   * @description
   * Full option object for the currently selected equipment status, or `null`.
   * Used by the `#selectedItem` template to render icon and colour.
   *
   * @since 2.0.0
   *
   * @access public
   * @type {Signal<EquipmentStatusOption | null>}
   */
  public readonly selectedEquipmentStatusOption: Signal<EquipmentStatusOption | null> =
    computed<EquipmentStatusOption | null>(
      () =>
        EQUIPMENT_STATUS_OPTIONS.find((o) => o.value === this.store.draftEquipmentStatus()) ?? null,
    );

  /**
   * Property selectedFacilityTypeOption
   * @readonly
   *
   * @description
   * Full option object for the currently selected facility type, or `null`.
   * Used by the `#selectedItem` template to render the icon.
   *
   * @since 2.0.0
   *
   * @access public
   * @type {Signal<FacilityTypeOption | null>}
   */
  public readonly selectedFacilityTypeOption: Signal<FacilityTypeOption | null> =
    computed<FacilityTypeOption | null>(
      () => FACILITY_TYPE_OPTIONS.find((o) => o.value === this.store.draftFacilityType()) ?? null,
    );

  //#endregion

  //#region Constructor

  /**
   * @constructor
   *
   * @description
   * Synchronises the reactive controls with the dashboard draft state.
   *
   * @access public
   * @since 2.1.0
   */
  public constructor() {
    this.form.controls.equipmentType.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((equipmentType: EquipmentTypeOption['value'] | null): void => {
        this.store.setDraftEquipmentType(equipmentType);
      });

    this.form.controls.equipmentStatus.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((equipmentStatus: EquipmentStatusOption['value'] | null): void => {
        this.store.setDraftEquipmentStatus(equipmentStatus);
      });

    this.form.controls.facilityType.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((facilityType: FacilityTypeOption['value'] | null): void => {
        this.store.setDraftFacilityType(facilityType);
      });

    effect((): void => {
      this.form.patchValue(
        {
          equipmentType: this.store.draftEquipmentType(),
          equipmentStatus: this.store.draftEquipmentStatus(),
          facilityType: this.store.draftFacilityType(),
        },
        { emitEvent: false },
      );
    });
  }

  //#endregion
}
