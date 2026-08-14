import { ChangeDetectionStrategy, Component, input, type InputSignal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type {
  EquipmentOutput,
  EquipmentType,
} from '@features/organization/features/equipments/models';
import { EQUIPMENT_TYPE_OPTIONS } from '@features/organization/features/equipments/options';
import { HlmSkeleton } from '@shared/ui/skeleton';
import { HlmTableImports } from '@shared/ui/table';
import { EquipmentStatusTag } from '../../components/equipment-status-tag';

/** Placeholder rows drawn while the first page loads. */
const SKELETON_ROWS: ReadonlyArray<number> = [1, 2, 3, 4, 5];

/**
 * Component EquipmentTable
 * @class EquipmentTable
 *
 * @description
 * The equipment grid: `hlmTable` inside a bordered, scrollable shell, one
 * row per equipment, no per-row menu — lifecycle actions live on the detail
 * record, not the list (`FEATURE.md` "Deletion (data-access only, no
 * duplicate UI)"), so the only interactive element per row is the type cell's
 * link to that record.
 *
 * Presentational (`ARCHITECTURE.md` §10.3) — it injects no store and calls
 * no service. The page decides what to load, filter and paginate; this
 * component only renders the page it is handed.
 *
 * @version 1.1.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-equipment-table',
  imports: [RouterLink, EquipmentStatusTag, HlmSkeleton, ...HlmTableImports],
  templateUrl: './equipment-table.component.html',
  host: { class: 'block min-h-0 w-full flex-1' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EquipmentTable {
  //#region Inputs
  /**
   * Property items
   * @readonly
   * @description The rows to render — already filtered, ordered and paged by the page.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly EquipmentOutput[]>}
   */
  public readonly items: InputSignal<readonly EquipmentOutput[]> =
    input.required<readonly EquipmentOutput[]>();

  /**
   * Property loading
   * @readonly
   * @description Whether to draw placeholder rows instead of the data.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly loading: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property detailRouteBase
   * @readonly
   * @description Path segments the row link appends the equipment id to.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly string[]>}
   */
  public readonly detailRouteBase: InputSignal<readonly string[]> =
    input.required<readonly string[]>();
  //#endregion

  //#region Properties
  /** Placeholder rows for the loading render. */
  protected readonly skeletonRows: ReadonlyArray<number> = SKELETON_ROWS;
  //#endregion

  //#region Methods
  /**
   * Method typeLabelOf
   * @description The equipment's type, humanized through the shared type catalog.
   * @access protected
   * @since 1.0.0
   * @param {string} type - The raw type value.
   * @returns {string} The localized label, or the raw value humanized if unknown.
   */
  protected typeLabelOf(type: string): string {
    return (
      EQUIPMENT_TYPE_OPTIONS.find((option) => option.value === (type as EquipmentType))?.label ??
      type.replace(/_/g, ' ')
    );
  }

  /**
   * Method brandModelOf
   * @description The brand and model, joined for one cell, or `null` when neither is set.
   * @access protected
   * @since 1.0.0
   * @param {EquipmentOutput} item - The equipment being rendered.
   * @returns {string | null} The joined label, or `null`.
   */
  protected brandModelOf(item: EquipmentOutput): string | null {
    const parts: readonly string[] = [item.brand, item.model].filter(
      (part): part is string => !!part,
    );

    return parts.length > 0 ? parts.join(' ') : null;
  }

  /**
   * Method columnCount
   * @description How many cells a row has, so the empty-state message can span the full width.
   * @access protected
   * @since 1.1.0
   * @returns {number} The rendered column count.
   */
  protected columnCount(): number {
    return 5;
  }
  //#endregion
}
