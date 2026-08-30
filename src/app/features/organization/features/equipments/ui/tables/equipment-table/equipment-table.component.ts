import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowDown, lucideArrowUp, lucideChevronsUpDown } from '@ng-icons/lucide';
import type {
  EquipmentListSort,
  EquipmentOutput,
  EquipmentSortField,
  EquipmentType,
} from '@features/organization/features/equipments/models';
import { EQUIPMENT_TYPE_OPTIONS } from '@features/organization/features/equipments/options';
import { CollectionSurface } from '@shared/collection-surface';
import { HlmButton } from '@shared/ui/button';
import { HlmTableImports } from '@shared/ui/table';
import { EquipmentStatusTag } from '../../components/equipment-status-tag';

/**
 * Component EquipmentTable
 * @class EquipmentTable
 *
 * @description
 * The equipment grid: `hlmTable` inside the shared collection surface, one
 * row per equipment, no per-row menu — lifecycle actions live on the detail
 * record, not the list (`FEATURE.md` "Deletion (data-access only, no
 * duplicate UI)"), so the only interactive element per row is the type cell's
 * link to that record.
 *
 * Presentational (`ARCHITECTURE.md` §10.3) — it injects no store and calls
 * no service. The page decides what to load, filter and paginate; this
 * component only renders the page it is handed. The bordered, scrollable
 * shell, the first-load skeleton and the below-`2xl` card fallback all come
 * from the shared `CollectionSurface`. Type, Brand and Status are
 * the columns the backend's own sort whitelist (`ListEquipmentsProvider`)
 * covers that this table also renders — "Model" and the two timestamp
 * fields have no dedicated column, so they carry no sortable head. Each head
 * is a ghost button carrying the direction glyph, mirroring
 * `InterventionTable`'s sortable-head pattern.
 *
 * @version 2.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-equipment-table',
  imports: [
    RouterLink,
    NgIcon,
    CollectionSurface,
    EquipmentStatusTag,
    HlmButton,
    ...HlmTableImports,
  ],
  providers: [provideIcons({ lucideArrowDown, lucideArrowUp, lucideChevronsUpDown })],
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
   * Property sortOrder
   * @readonly
   * @description The active ordering, deciding what each sortable head announces and which direction glyph it shows.
   * @access public
   * @since 1.2.0
   * @type {InputSignal<EquipmentListSort>}
   */
  public readonly sortOrder: InputSignal<EquipmentListSort> = input.required<EquipmentListSort>();

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

  //#region Outputs
  /**
   * Property sortChanged
   * @readonly
   * @description A sortable head was activated; carries the field. Re-emitting the active field means "reverse it" — the page owns the direction.
   * @access public
   * @since 1.2.0
   * @type {OutputEmitterRef<EquipmentSortField>}
   */
  public readonly sortChanged: OutputEmitterRef<EquipmentSortField> = output<EquipmentSortField>();
  //#endregion

  //#region Properties
  /**
   * Property skeletonColumnWidths
   * @readonly
   * @description One literal Tailwind width per rendered column, handed to the shared surface's skeleton rows. Literal strings because Tailwind scans source text, and column-aware because a skeleton whose blocks do not line up with the header it replaces reads as a broken table rather than a loading one.
   * @access protected
   * @since 2.0.0
   * @type {readonly string[]}
   */
  protected readonly skeletonColumnWidths: readonly string[] = [
    'w-32',
    'w-24',
    'w-20',
    'w-20',
    'w-24',
  ];
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

  /**
   * Method ariaSort
   * @description What a sortable head announces for the active ordering.
   * @access protected
   * @since 1.2.0
   * @param {EquipmentSortField} field - The head's field.
   * @returns {'ascending' | 'descending' | 'none'} The `aria-sort` value.
   */
  protected ariaSort(field: EquipmentSortField): 'ascending' | 'descending' | 'none' {
    const active: EquipmentListSort = this.sortOrder();

    if (active.field !== field) return 'none';

    return active.direction === 'asc' ? 'ascending' : 'descending';
  }

  /**
   * Method sortIcon
   * @description The glyph a sortable head shows: a direction when it is the active one, a neutral pair otherwise.
   * @access protected
   * @since 1.2.0
   * @param {EquipmentSortField} field - The head's field.
   * @returns {string} A registered lucide name.
   */
  protected sortIcon(field: EquipmentSortField): string {
    const active: EquipmentListSort = this.sortOrder();

    if (active.field !== field) return 'lucideChevronsUpDown';

    return active.direction === 'asc' ? 'lucideArrowUp' : 'lucideArrowDown';
  }
  //#endregion
}
