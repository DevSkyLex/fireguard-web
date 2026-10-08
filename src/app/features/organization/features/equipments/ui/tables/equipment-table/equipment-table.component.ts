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
import { HlmBadgeImports } from '@shared/ui/badge';
import { HlmButton } from '@shared/ui/button';
import { HlmTableImports } from '@shared/ui/table';
import { EquipmentStatusTag } from '../../components/equipment-status-tag';

/**
 * Constant VISIBLE_TAG_COUNT
 *
 * @description
 * How many tags a row shows outright before folding the rest into a "+N" badge.
 */
const VISIBLE_TAG_COUNT: number = 2;

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
 * Presentational (`ARCHITECTURE.md` §10.3) — it injects no store and calls
 * no service. The page decides what to load, filter and paginate; this
 * component only renders the page it is handed. The bordered, scrollable
 * shell, the first-load skeleton and the below-`2xl` card fallback all come
 * from the shared `CollectionSurface`. Type, Brand and Status are
 * the columns the backend's own sort whitelist (`ListEquipmentsProvider`)
 * covers that this table also renders — "Model" and the two timestamp
 * fields have no dedicated column, so they carry no sortable head. Each head
 * is a ghost button carrying the direction glyph, mirroring
 * `InterventionTable`'s sortable-head pattern. The Location cell's facility
 * name links to that facility's record, and each row's first two tags render
 * as outline badges with a "+N" overflow badge for the rest.
 *
 * @version 2.1.0
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
    ...HlmBadgeImports,
    ...HlmTableImports,
  ],
  providers: [provideIcons({ lucideArrowDown, lucideArrowUp, lucideChevronsUpDown })],
  templateUrl: './equipment-table.component.html',
  host: { class: 'block min-h-0 w-full flex-1 max-md:min-h-fit max-md:flex-none' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EquipmentTable {
  //#region Inputs
  /**
   * Property typeOptions
   * @readonly
   *
   * @description
   * Server catalog naming custom and archived equipment types.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<typeof EQUIPMENT_TYPE_OPTIONS>}
   */
  public readonly typeOptions: InputSignal<typeof EQUIPMENT_TYPE_OPTIONS> =
    input<typeof EQUIPMENT_TYPE_OPTIONS>(EQUIPMENT_TYPE_OPTIONS);
  /**
   * Property items
   * @readonly
   *
   * @description
   * The rows to render — already filtered, ordered and paged by the page.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly EquipmentOutput[]>}
   */
  public readonly items: InputSignal<readonly EquipmentOutput[]> =
    input.required<readonly EquipmentOutput[]>();

  /**
   * Property loading
   * @readonly
   *
   * @description
   * Whether to draw placeholder rows instead of the data.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly loading: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property sortOrder
   * @readonly
   *
   * @description
   * The active ordering, deciding what each sortable head announces and which direction glyph it
   * shows.
   *
   * @access public
   * @since 1.2.0
   *
   * @type {InputSignal<EquipmentListSort>}
   */
  public readonly sortOrder: InputSignal<EquipmentListSort> = input.required<EquipmentListSort>();

  /**
   * Property detailRouteBase
   * @readonly
   *
   * @description
   * Path segments the row link appends the equipment id to.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly string[]>}
   */
  public readonly detailRouteBase: InputSignal<readonly string[]> =
    input.required<readonly string[]>();

  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * The workspace a row's facility link is scoped to.
   *
   * @access public
   * @since 2.1.0
   *
   * @type {InputSignal<string>}
   */
  public readonly organizationId: InputSignal<string> = input.required<string>();
  //#endregion

  //#region Outputs
  /**
   * Property sortChanged
   * @readonly
   *
   * @description
   * A sortable head was activated; carries the field. Re-emitting the active field means "reverse
   * it" — the page owns the direction.
   *
   * @access public
   * @since 1.2.0
   *
   * @type {OutputEmitterRef<EquipmentSortField>}
   */
  public readonly sortChanged: OutputEmitterRef<EquipmentSortField> = output<EquipmentSortField>();
  //#endregion

  //#region Properties
  /**
   * Property skeletonColumnWidths
   * @readonly
   *
   * @description
   * One literal Tailwind width per rendered column, handed to the shared surface's skeleton rows.
   * Literal strings because Tailwind scans source text, and column-aware because a skeleton whose
   * blocks do not line up with the header it replaces reads as a broken table rather than a loading
   * one.
   *
   * @access protected
   * @since 2.0.0
   *
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
   * @method typeLabelOf
   *
   * @description
   * The equipment's type, humanized through the shared type catalog.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} type - The raw type value.
   *
   * @returns {string} The localized label, or the raw value humanized if unknown.
   */
  protected typeLabelOf(type: string): string {
    return (
      this.typeOptions().find((option) => option.value === (type as EquipmentType))?.label ??
      type.replaceAll('_', ' ')
    );
  }

  /**
   * Method brandModelOf
   * @method brandModelOf
   *
   * @description
   * The brand and model, joined for one cell, or `null` when neither is set.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {EquipmentOutput} item - The equipment being rendered.
   *
   * @returns {string | null} The joined label, or `null`.
   */
  protected brandModelOf(item: EquipmentOutput): string | null {
    const parts: readonly string[] = [item.brand, item.model].filter(
      (part): part is string => !!part,
    );

    return parts.length > 0 ? parts.join(' ') : null;
  }

  /**
   * Method facilityRoute
   * @method facilityRoute
   *
   * @description
   * The route to the row's assigned facility record, or `null` when unassigned.
   *
   * @access protected
   * @since 2.1.0
   *
   * @param {EquipmentOutput} item - The equipment being rendered.
   *
   * @returns {readonly string[] | null} The facility detail route.
   */
  protected facilityRoute(item: EquipmentOutput): readonly string[] | null {
    if (!item.facilityId) return null;

    return ['/organizations', this.organizationId(), 'facilities', item.facilityId];
  }

  /**
   * Method visibleTags
   * @method visibleTags
   *
   * @description
   * The first {@link VISIBLE_TAG_COUNT} tag names shown outright.
   *
   * @access protected
   * @since 2.1.0
   *
   * @param {EquipmentOutput} item - The equipment being rendered.
   *
   * @returns {readonly string[]} The tag names to render as badges.
   */
  protected visibleTags(item: EquipmentOutput): readonly string[] {
    return item.tags.slice(0, VISIBLE_TAG_COUNT).map((tag) => tag.name);
  }

  /**
   * Method hiddenTagCount
   * @method hiddenTagCount
   *
   * @description
   * How many tags are folded behind the "+N" badge.
   *
   * @access protected
   * @since 2.1.0
   *
   * @param {EquipmentOutput} item - The equipment being rendered.
   *
   * @returns {number} The count of tags beyond {@link VISIBLE_TAG_COUNT}.
   */
  protected hiddenTagCount(item: EquipmentOutput): number {
    return Math.max(0, item.tags.length - VISIBLE_TAG_COUNT);
  }

  /**
   * Method hiddenTagsAriaLabel
   * @method hiddenTagsAriaLabel
   *
   * @description
   * The accessible name for the "+N" overflow badge, since its visible text alone does not say it
   * means tags.
   *
   * @access protected
   * @since 2.1.0
   *
   * @param {number} hidden - How many tags are folded behind the badge.
   *
   * @returns {string} The localized, pluralized accessible name.
   */
  protected hiddenTagsAriaLabel(hidden: number): string {
    return hidden === 1
      ? $localize`:@@equipment.table.hiddenTagOne:1 more tag`
      : $localize`:@@equipment.table.hiddenTagOther:${hidden}:count: more tags`;
  }

  /**
   * Method columnCount
   * @method columnCount
   *
   * @description
   * How many cells a row has, so the empty-state message can span the full width.
   *
   * @access protected
   * @since 1.1.0
   *
   * @returns {number} The rendered column count.
   */
  protected columnCount(): number {
    return 5;
  }

  /**
   * Method ariaSort
   * @method ariaSort
   *
   * @description
   * What a sortable head announces for the active ordering.
   *
   * @access protected
   * @since 1.2.0
   *
   * @param {EquipmentSortField} field - The head's field.
   *
   * @returns {'ascending' | 'descending' | 'none'} The `aria-sort` value.
   */
  protected ariaSort(field: EquipmentSortField): 'ascending' | 'descending' | 'none' {
    const active: EquipmentListSort = this.sortOrder();

    if (active.field !== field) return 'none';

    return active.direction === 'asc' ? 'ascending' : 'descending';
  }

  /**
   * Method sortIcon
   * @method sortIcon
   *
   * @description
   * The glyph a sortable head shows: a direction when it is the active one, a neutral pair
   * otherwise.
   *
   * @access protected
   * @since 1.2.0
   *
   * @param {EquipmentSortField} field - The head's field.
   *
   * @returns {string} A registered lucide name.
   */
  protected sortIcon(field: EquipmentSortField): string {
    const active: EquipmentListSort = this.sortOrder();

    if (active.field !== field) return 'lucideChevronsUpDown';

    return active.direction === 'asc' ? 'lucideArrowUp' : 'lucideArrowDown';
  }
  //#endregion
}
