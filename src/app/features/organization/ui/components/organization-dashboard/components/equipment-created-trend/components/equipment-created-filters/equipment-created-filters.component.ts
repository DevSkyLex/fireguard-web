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
import { OrganizationDashboardEquipmentCreatedStore } from '@features/organization/state/organization-dashboard';
import { TrendBaseFiltersForm } from '@features/organization/ui/components/organization-dashboard/forms';
import type {
  EquipmentStatusOption,
  EquipmentTypeOption,
} from '@features/organization/ui/components/organization-dashboard/models';
import {
  EQUIPMENT_STATUS_OPTIONS,
  EQUIPMENT_TYPE_OPTIONS,
} from '@features/organization/ui/components/organization-dashboard/options';

/**
 * Type EquipmentCreatedFiltersForm
 *
 * @description
 * Typed reactive controls used by the equipment-created draft filter form.
 *
 * @since 2.1.0
 */
type EquipmentCreatedFiltersForm = {
  equipmentType: FormControl<EquipmentTypeOption['value'] | null>;
  equipmentStatus: FormControl<EquipmentStatusOption['value'] | null>;
};

/**
 * Component EquipmentCreatedFilters
 * @class EquipmentCreatedFilters
 *
 * @description
 * Drawer filter form for the equipment-created trend card.
 * All draft filter state is read and mutated directly through
 * {@link OrganizationDashboardEquipmentCreatedStore}.
 *
 * @version 2.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-equipment-created-filters',
  templateUrl: './equipment-created-filters.component.html',
  imports: [ReactiveFormsModule, SelectModule, TrendBaseFiltersForm],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EquipmentCreatedFilters {
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
   * @type {OrganizationDashboardEquipmentCreatedStore}
   */
  protected readonly store: OrganizationDashboardEquipmentCreatedStore =
    inject<OrganizationDashboardEquipmentCreatedStore>(OrganizationDashboardEquipmentCreatedStore);

  /**
   * Property form
   * @readonly
   *
   * @description
   * Typed reactive form group for equipment-created-specific draft filters.
   *
   * @access protected
   * @since 2.1.0
   *
   * @type {FormGroup<EquipmentCreatedFiltersForm>}
   */
  protected readonly form: FormGroup<EquipmentCreatedFiltersForm> =
    new FormGroup<EquipmentCreatedFiltersForm>({
      equipmentType: new FormControl<EquipmentTypeOption['value'] | null>(null),
      equipmentStatus: new FormControl<EquipmentStatusOption['value'] | null>(null),
    });

  /**
   * Property equipmentTypeOptions
   * @readonly
   *
   * @description
   * Available equipment type filter options rendered in the first select.
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
   * Available equipment status filter options rendered in the second select.
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
   * Property selectedEquipmentStatusOption
   * @readonly
   *
   * @description
   * Full option object for the currently selected equipment status, or `null` when
   * cleared. Used by the `#selectedItem` template to render icon and colour.
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

    effect((): void => {
      this.form.patchValue(
        {
          equipmentType: this.store.draftEquipmentType(),
          equipmentStatus: this.store.draftEquipmentStatus(),
        },
        { emitEvent: false },
      );
    });
  }

  //#endregion
}
