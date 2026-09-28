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
import {
  lucideArrowDown,
  lucideArrowUp,
  lucideChevronsUpDown,
  lucideTriangleAlert,
} from '@ng-icons/lucide';
import { pickAvatarUrl } from '@core/api/utils';
import type {
  InspectionListSort,
  InspectionOutput,
  InspectionSortField,
} from '@features/organization/features/inspections/models';
import { CollectionSurface } from '@shared/collection-surface';
import {
  DEFAULT_REGIONAL_FORMAT_SETTINGS,
  OrgDatePipe,
  type RegionalFormatSettings,
} from '@shared/regional-format';
import { HlmAvatarImports } from '@shared/ui/avatar';
import { HlmButton } from '@shared/ui/button';
import { HlmItemImports } from '@shared/ui/item';
import { HlmTableImports } from '@shared/ui/table';
import { InspectionStatusTag } from '../../components/inspection-status-tag';

/**
 * Component InspectionTable
 * @class InspectionTable
 *
 * @description
 * The inspection grid: `hlmTable` inside the shared collection surface, one
 * row per inspection, no per-row menu — every property is edited on the
 * detail record, not the list (`FEATURE.md` "The record is the edit
 * surface"), so the only interactive element per row is the date cell's
 * link to that record. The Equipment column renders {@link InspectionOutput}'s
 * `equipmentSerialNumber` (falling back to a neutral label, never the raw
 * id) with its `facilityName` as a muted second line, and the inspector
 * renders with an avatar, mirroring `InterventionInspectionsTable`'s pattern
 * for the same resource.
 *
 * "Performed on", "Result" and "Status" are sortable heads, the same ghost-
 * button-with-glyph pattern `InterventionTable` uses — the backend's own
 * whitelist (`result`, `status`, `performedAt`, `createdAt`) also allows
 * `createdAt`, but this table renders no column for it, so no head offers it.
 *
 * Presentational (`ARCHITECTURE.md` §10.3) — it injects no store and calls
 * no service. The page decides what to load, filter, sort and paginate;
 * this component only renders the page it is handed and emits
 * {@link sortChanged} when a head is activated. The bordered, scrollable
 * shell, the first-load skeleton and the below-`2xl` card fallback all come
 * from the shared `CollectionSurface`.
 *
 * @version 2.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-inspection-table',
  imports: [
    RouterLink,
    NgIcon,
    OrgDatePipe,
    CollectionSurface,
    HlmButton,
    InspectionStatusTag,
    ...HlmAvatarImports,
    ...HlmTableImports,
    ...HlmItemImports,
  ],
  providers: [
    provideIcons({ lucideArrowDown, lucideArrowUp, lucideChevronsUpDown, lucideTriangleAlert }),
  ],
  templateUrl: './inspection-table.component.html',
  host: { class: 'block min-h-0 w-full flex-1' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InspectionTable {
  //#region Inputs
  /**
   * Property items
   * @readonly
   * @description The rows to render — already filtered, ordered and paged by the page.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly InspectionOutput[]>}
   */
  public readonly items: InputSignal<readonly InspectionOutput[]> =
    input.required<readonly InspectionOutput[]>();

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
   * @description Path segments the row link appends the inspection id to.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly string[]>}
   */
  public readonly detailRouteBase: InputSignal<readonly string[]> =
    input.required<readonly string[]>();

  /**
   * Property sortOrder
   * @readonly
   *
   * @description
   * The active ordering, deciding what each sortable head announces and
   * which direction glyph it shows.
   *
   * @access public
   * @since 1.2.0
   *
   * @type {InputSignal<InspectionListSort>}
   */
  public readonly sortOrder: InputSignal<InspectionListSort> = input.required<InspectionListSort>();

  /**
   * Property regionalFormatting
   * @readonly
   * @description The active organization's date pattern and timezone, bound by the page. The default keeps the component renderable with no context wired.
   * @access public
   * @since 2.1.0
   * @type {InputSignal<RegionalFormatSettings>}
   */
  public readonly regionalFormatting: InputSignal<RegionalFormatSettings> =
    input<RegionalFormatSettings>(DEFAULT_REGIONAL_FORMAT_SETTINGS);
  //#endregion

  //#region Outputs
  /**
   * Property sortChanged
   * @readonly
   *
   * @description
   * A sortable head was activated; carries the field. Re-emitting the active
   * field means "reverse it" — the page owns the direction.
   *
   * @access public
   * @since 1.2.0
   *
   * @type {OutputEmitterRef<InspectionSortField>}
   */
  public readonly sortChanged: OutputEmitterRef<InspectionSortField> =
    output<InspectionSortField>();
  //#endregion

  //#region Properties
  /**
   * Property skeletonColumnWidths
   * @readonly
   *
   * @description
   * One literal Tailwind width per rendered column, handed to the shared
   * surface's skeleton rows. Literal strings because Tailwind scans source
   * text, and column-aware because a skeleton whose blocks do not line up
   * with the header it replaces reads as a broken table rather than a
   * loading one.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {readonly string[]}
   */
  protected readonly skeletonColumnWidths: readonly string[] = [
    'w-24',
    'w-32',
    'w-32',
    'w-20',
    'w-20',
    'w-8',
  ];
  //#endregion

  //#region Methods
  /**
   * Method columnCount
   * @description How many cells a row has, so the empty-state message can span the full width.
   * @access protected
   * @since 1.1.0
   * @returns {number} The rendered column count.
   */
  protected columnCount(): number {
    return 6;
  }

  /**
   * Method equipmentLabelOf
   * @description The Equipment column's identity: the serial number, or a neutral label — never the raw id.
   * @access protected
   * @since 2.1.0
   * @param {InspectionOutput} item - The row being rendered.
   * @returns {string | null} The serial number, or `null` when absent.
   */
  protected equipmentLabelOf(item: InspectionOutput): string | null {
    return item.equipmentSerialNumber ?? null;
  }

  /**
   * Method inspectorInitialsOf
   * @description Avatar fallback initials derived from the inspector's display name.
   * @access protected
   * @since 2.1.0
   * @param {InspectionOutput} item - The row being rendered.
   * @returns {string} Up to two uppercase initials, or an empty string when there is no inspector.
   */
  protected inspectorInitialsOf(item: InspectionOutput): string {
    const name: string | undefined = item.inspector?.displayName;
    if (!name) return '';

    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part: string): string => part.charAt(0).toUpperCase())
      .join('');
  }

  /**
   * Method inspectorAvatarUrlOf
   * @description The inspector's best-fit avatar URL for a small avatar, or `null` when none is available.
   * @access protected
   * @since 2.1.0
   * @param {InspectionOutput} item - The row being rendered.
   * @returns {string | null} The resolved avatar URL, or `null`.
   */
  protected inspectorAvatarUrlOf(item: InspectionOutput): string | null {
    const inspector = item.inspector;
    if (!inspector) return null;

    return pickAvatarUrl(inspector.avatarUrls, '64', inspector.avatarUrl);
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
   * @param {InspectionSortField} field - The head's field.
   *
   * @returns {'ascending' | 'descending' | 'none'} The `aria-sort` value.
   */
  protected ariaSort(field: InspectionSortField): 'ascending' | 'descending' | 'none' {
    const active: InspectionListSort = this.sortOrder();

    if (active.field !== field) return 'none';

    return active.direction === 'asc' ? 'ascending' : 'descending';
  }

  /**
   * Method sortIcon
   * @method sortIcon
   *
   * @description
   * The glyph a sortable head shows: a direction when it is the active one, a
   * neutral pair otherwise.
   *
   * @access protected
   * @since 1.2.0
   *
   * @param {InspectionSortField} field - The head's field.
   *
   * @returns {string} A registered lucide name.
   */
  protected sortIcon(field: InspectionSortField): string {
    const active: InspectionListSort = this.sortOrder();

    if (active.field !== field) return 'lucideChevronsUpDown';

    return active.direction === 'asc' ? 'lucideArrowUp' : 'lucideArrowDown';
  }
  //#endregion
}
