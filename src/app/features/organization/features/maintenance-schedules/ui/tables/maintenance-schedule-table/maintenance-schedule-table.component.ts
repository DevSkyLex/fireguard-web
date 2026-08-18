import { DatePipe } from '@angular/common';
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
import { lucidePencil } from '@ng-icons/lucide';
import { EQUIPMENT_TYPE_OPTIONS } from '@features/organization/features/equipments';
import type { MaintenanceScheduleOutput } from '@features/organization/features/maintenance-schedules/models';
import { MAINTENANCE_OVERRIDE_DURATION_OPTIONS } from '@features/organization/features/maintenance-schedules/options';
import { iriId } from '@features/organization/features/maintenance-schedules/utils';
import { HlmButton } from '@shared/ui/button';
import { HlmSkeleton } from '@shared/ui/skeleton';
import { HlmTableImports } from '@shared/ui/table';
import { MaintenanceDueStatusTag } from '../../components/maintenance-due-status-tag';

/** Placeholder rows drawn while the first page loads. */
const SKELETON_ROWS: ReadonlyArray<number> = [1, 2, 3, 4, 5];

/**
 * Component MaintenanceScheduleTable
 * @class MaintenanceScheduleTable
 *
 * @description
 * The maintenance schedules grid: `hlmTable` inside a bordered, scrollable
 * shell, one row per schedule — equipment (linking to its detail record),
 * equipment type, facility (linking when assigned), next-due date (or
 * "Never inspected" for a tracked-but-unreviewed schedule, per the backend
 * contract), the authoritative due-status badge, and the current interval
 * override with an Edit action.
 *
 * Presentational (`ARCHITECTURE.md` §10.3) — it injects no store and calls
 * no service. The page decides what to load, filter and paginate, and
 * whether the operator may manage overrides ({@link canManage}); this
 * component only renders the page it is handed and emits
 * {@link overrideRequested} for the page to open the override dialog.
 *
 * The facility cell and the equipment link's accessible name both resolve
 * through {@link facilityLabelOf}, the page's own facility catalog, so two
 * rows tracking the same equipment type at different facilities read as
 * distinguishable rather than an identical "Fire extinguisher" /
 * "View facility" pair pointing at different records.
 *
 * @version 1.1.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-maintenance-schedule-table',
  imports: [
    DatePipe,
    RouterLink,
    NgIcon,
    MaintenanceDueStatusTag,
    HlmButton,
    HlmSkeleton,
    ...HlmTableImports,
  ],
  providers: [provideIcons({ lucidePencil })],
  templateUrl: './maintenance-schedule-table.component.html',
  host: { class: 'block min-h-0 w-full flex-1' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MaintenanceScheduleTable {
  //#region Inputs
  /**
   * Property items
   * @readonly
   * @description The rows to render — already filtered, ordered and paged by the page.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly MaintenanceScheduleOutput[]>}
   */
  public readonly items: InputSignal<readonly MaintenanceScheduleOutput[]> =
    input.required<readonly MaintenanceScheduleOutput[]>();

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
   * Property canManage
   * @readonly
   * @description Whether the active member may open the interval-override dialog (`organization.maintenance.manage`).
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly canManage: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property equipmentRouteBase
   * @readonly
   * @description Path segments the equipment link appends the equipment id to.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly string[]>}
   */
  public readonly equipmentRouteBase: InputSignal<readonly string[]> =
    input.required<readonly string[]>();

  /**
   * Property facilityRouteBase
   * @readonly
   * @description Path segments the facility link appends the facility id to.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly string[]>}
   */
  public readonly facilityRouteBase: InputSignal<readonly string[]> =
    input.required<readonly string[]>();

  /**
   * Property facilityLabelOf
   * @readonly
   *
   * @description
   * Resolves a facility id to its name, from the page's own facility
   * catalog. Two rows tracking the same equipment type at different
   * facilities otherwise render identical link text ("Fire extinguisher" /
   * "View facility") pointing at different records; this disambiguates both
   * the facility cell and the equipment link's accessible name. Defaults to
   * always resolving `null`, which falls back to the generic labels.
   *
   * @access public
   * @since 1.1.0
   * @type {InputSignal<(facilityId: string) => string | null>}
   */
  public readonly facilityLabelOf: InputSignal<(facilityId: string) => string | null> = input<
    (facilityId: string) => string | null
  >(() => null);
  //#endregion

  //#region Outputs
  /**
   * Property overrideRequested
   * @readonly
   * @description A row's Edit action was activated; carries that row's schedule.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<MaintenanceScheduleOutput>}
   */
  public readonly overrideRequested: OutputEmitterRef<MaintenanceScheduleOutput> =
    output<MaintenanceScheduleOutput>();
  //#endregion

  //#region Properties
  /** Placeholder rows for the loading render. */
  protected readonly skeletonRows: ReadonlyArray<number> = SKELETON_ROWS;
  //#endregion

  //#region Methods
  /**
   * Method equipmentIdOf
   * @description The bare id extracted from a schedule's equipment IRI, for the row link.
   * @access protected
   * @since 1.0.0
   * @param {MaintenanceScheduleOutput} item - The rendered schedule.
   * @returns {string} The equipment id.
   */
  protected equipmentIdOf(item: MaintenanceScheduleOutput): string {
    return iriId(item.equipment);
  }

  /**
   * Method facilityIdOf
   * @description The bare id extracted from a schedule's facility IRI, or `null` when unassigned.
   * @access protected
   * @since 1.0.0
   * @param {MaintenanceScheduleOutput} item - The rendered schedule.
   * @returns {string | null} The facility id, or `null`.
   */
  protected facilityIdOf(item: MaintenanceScheduleOutput): string | null {
    return item.facility ? iriId(item.facility) : null;
  }

  /**
   * Method equipmentLinkAriaLabelOf
   *
   * @description
   * The equipment link's accessible name, folding in the facility name so
   * two rows sharing the same equipment type — the link's own visible text —
   * stay distinguishable to assistive tech, mirroring
   * `InterventionEquipmentTable.linkAriaLabelOf`. `null` when the schedule
   * carries no facility or the facility name does not resolve, which drops
   * the attribute and falls back to the link's own text content.
   *
   * @access protected
   * @since 1.1.0
   *
   * @param {MaintenanceScheduleOutput} item - The rendered schedule.
   *
   * @returns {string | null} The accessible name, or `null`.
   */
  protected equipmentLinkAriaLabelOf(item: MaintenanceScheduleOutput): string | null {
    const facilityId: string | null = this.facilityIdOf(item);
    const facilityName: string | null = facilityId ? this.facilityLabelOf()(facilityId) : null;

    if (!facilityName) return null;

    const type: string = this.equipmentTypeLabelOf(item.equipmentType);

    return $localize`:@@maintenance.table.equipmentLinkAriaLabel:${type}:type: at ${facilityName}:facility:`;
  }

  /**
   * Method equipmentTypeLabelOf
   * @description The schedule's equipment type, humanized through the shared type catalog.
   * @access protected
   * @since 1.0.0
   * @param {string} equipmentType - The raw type value.
   * @returns {string} The localized label, or the raw value humanized if unknown.
   */
  protected equipmentTypeLabelOf(equipmentType: string): string {
    return (
      EQUIPMENT_TYPE_OPTIONS.find((option) => option.value === equipmentType)?.label ??
      equipmentType.replace(/_/g, ' ')
    );
  }

  /**
   * Method overrideLabelOf
   * @description The schedule's interval override, humanized through the duration catalog, or `null` when it follows the organization default.
   * @access protected
   * @since 1.0.0
   * @param {MaintenanceScheduleOutput} item - The rendered schedule.
   * @returns {string | null} The localized duration label, or `null`.
   */
  protected overrideLabelOf(item: MaintenanceScheduleOutput): string | null {
    if (!item.intervalOverride) return null;

    return (
      MAINTENANCE_OVERRIDE_DURATION_OPTIONS.find((option) => option.value === item.intervalOverride)
        ?.label ?? item.intervalOverride
    );
  }

  /**
   * Method isNeverInspected
   * @description Whether a schedule is tracked but has never had an inspection recorded — `overdue` with no `nextDueAt` — the state the contract requires an explicit label for.
   * @access protected
   * @since 1.0.0
   * @param {MaintenanceScheduleOutput} item - The rendered schedule.
   * @returns {boolean} `true` for the never-inspected state.
   */
  protected isNeverInspected(item: MaintenanceScheduleOutput): boolean {
    return !item.nextDueAt && item.dueStatus === 'overdue';
  }

  /**
   * Method columnCount
   * @description How many cells a row has, so the empty-state message can span the full width.
   * @access protected
   * @since 1.0.0
   * @returns {number} The rendered column count.
   */
  protected columnCount(): number {
    return 6;
  }
  //#endregion
}
