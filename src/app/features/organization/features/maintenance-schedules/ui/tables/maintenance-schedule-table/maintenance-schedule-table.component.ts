import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  LOCALE_ID,
  output,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucidePencil } from '@ng-icons/lucide';
import type { EquipmentTypeOption } from '@features/organization/features/equipments';
import type { MaintenanceScheduleOutput } from '@features/organization/features/maintenance-schedules/models';
import { MAINTENANCE_OVERRIDE_DURATION_OPTIONS } from '@features/organization/features/maintenance-schedules/options';
import { iriId } from '@features/organization/features/maintenance-schedules/utils';
import { CollectionSurface } from '@shared/collection-surface';
import {
  DEFAULT_REGIONAL_FORMAT_SETTINGS,
  OrgDatePipe,
  type RegionalFormatSettings,
} from '@shared/regional-format';
import { formatRelativeDays } from '@shared/relative-time';
import { HlmButton } from '@shared/ui/button';
import { HlmItemImports } from '@shared/ui/item';
import { HlmTableImports } from '@shared/ui/table';
import { HlmTooltipImports } from '@shared/ui/tooltip';
import { MaintenanceDueStatusTag } from '../../components/maintenance-due-status-tag';

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
 * Presentational (`ARCHITECTURE.md` §10.3) — it injects no store and calls
 * no service. The page decides what to load, filter and paginate, and
 * whether the operator may manage overrides ({@link canManage}); this
 * component only renders the page it is handed and emits
 * {@link overrideRequested} for the page to open the override dialog.
 * The facility cell and the equipment link's accessible name both resolve
 * through {@link facilityLabelOf}, the page's own facility catalog, so two
 * rows tracking the same equipment type at different facilities read as
 * distinguishable rather than an identical "Fire extinguisher" /
 * "View facility" pair pointing at different records.
 * Built on the shared `CollectionSurface`, which owns the bordered scroll
 * shell, the first-load skeleton and the table/card switch. Below the
 * surface's container breakpoint a schedule reads as a card: the equipment
 * link as the identity, next-due and due status beneath it, and the facility
 * demoted to a third line — two links of equal weight on one card would read
 * as two records rather than one.
 *
 * @version 2.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-maintenance-schedule-table',
  imports: [
    NgTemplateOutlet,
    OrgDatePipe,
    RouterLink,
    CollectionSurface,
    NgIcon,
    MaintenanceDueStatusTag,
    HlmButton,
    ...HlmTableImports,
    ...HlmItemImports,
    ...HlmTooltipImports,
  ],
  providers: [provideIcons({ lucidePencil })],
  templateUrl: './maintenance-schedule-table.component.html',
  host: {
    class:
      'block min-h-0 w-full flex-1 mobile-ui:min-h-fit mobile-ui:flex-none mobile-ui:md:min-h-0 mobile-ui:md:flex-1',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MaintenanceScheduleTable {
  //#region Inputs
  /**
   * Property equipmentTypeOptions
   * @readonly
   *
   * @description
   * Authorized catalog labels for current and historical equipment type codes.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<readonly EquipmentTypeOption[]>}
   */
  public readonly equipmentTypeOptions: InputSignal<readonly EquipmentTypeOption[]> = input<
    readonly EquipmentTypeOption[]
  >([]);

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
   * @type {InputSignal<readonly MaintenanceScheduleOutput[]>}
   */
  public readonly items: InputSignal<readonly MaintenanceScheduleOutput[]> =
    input.required<readonly MaintenanceScheduleOutput[]>();

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
   * Property canManage
   * @readonly
   *
   * @description
   * Whether the active member may open the interval-override dialog
   * (`organization.maintenance.manage`).
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly canManage: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property equipmentRouteBase
   * @readonly
   *
   * @description
   * Path segments the equipment link appends the equipment id to.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly string[]>}
   */
  public readonly equipmentRouteBase: InputSignal<readonly string[]> =
    input.required<readonly string[]>();

  /**
   * Property facilityRouteBase
   * @readonly
   *
   * @description
   * Path segments the facility link appends the facility id to.
   *
   * @access public
   * @since 1.0.0
   *
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
   *
   * @type {InputSignal<(facilityId: string) => string | null>}
   */
  public readonly facilityLabelOf: InputSignal<(facilityId: string) => string | null> = input<
    (facilityId: string) => string | null
  >(() => null);

  /**
   * Property regionalFormatting
   * @readonly
   *
   * @description
   * The active organization's date pattern and timezone, bound by the page. The default keeps the
   * component renderable with no context wired.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<RegionalFormatSettings>}
   */
  public readonly regionalFormatting: InputSignal<RegionalFormatSettings> =
    input<RegionalFormatSettings>(DEFAULT_REGIONAL_FORMAT_SETTINGS);
  //#endregion

  //#region Outputs
  /**
   * Property overrideRequested
   * @readonly
   *
   * @description
   * A row's Edit action was activated; carries that row's schedule.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<MaintenanceScheduleOutput>}
   */
  public readonly overrideRequested: OutputEmitterRef<MaintenanceScheduleOutput> =
    output<MaintenanceScheduleOutput>();
  //#endregion

  //#region Properties
  /**
   * Property locale
   * @readonly
   *
   * @description
   * The application's active locale, for the relative next-due label.
   *
   * @access private
   * @since unreleased
   *
   * @type {string}
   */
  private readonly locale: string = inject(LOCALE_ID);

  /**
   * Property orgDatePipe
   * @readonly
   *
   * @description
   * Pure, dependency-free date formatter for {@link evaluationTooltipOf} and the next-due cell — no
   * DI needed for a single-instance internal use.
   *
   * @access private
   * @since unreleased
   *
   * @type {OrgDatePipe}
   */
  private readonly orgDatePipe: OrgDatePipe = new OrgDatePipe();

  /**
   * Property skeletonColumnWidths
   * @readonly
   *
   * @description
   * One literal Tailwind width per rendered column, handed to the shared
   * surface's skeleton rows. Literal strings because Tailwind scans source
   * text, and column-aware — the trailing actions width only joins the list
   * when {@link canManage} renders that column at all.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<readonly string[]>}
   */
  protected readonly skeletonColumnWidths: Signal<readonly string[]> = computed<readonly string[]>(
    () => {
      const widths: string[] = ['w-32', 'w-24', 'w-24', 'w-20', 'w-20', 'w-24'];

      if (this.canManage()) widths.push('w-8');

      return widths;
    },
  );
  //#endregion

  //#region Methods
  /**
   * Method equipmentIdOf
   *
   * @description
   * The bare id extracted from a schedule's equipment IRI, for the row link.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {MaintenanceScheduleOutput} item - The rendered schedule.
   *
   * @returns {string} The equipment id.
   */
  protected equipmentIdOf(item: MaintenanceScheduleOutput): string {
    return iriId(item.equipment);
  }

  /**
   * Method facilityIdOf
   *
   * @description
   * The bare id extracted from a schedule's facility IRI, or `null` when unassigned.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {MaintenanceScheduleOutput} item - The rendered schedule.
   *
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
   *
   * @description
   * The schedule's equipment type, humanized through the shared type catalog.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} equipmentType - The raw type value.
   *
   * @returns {string} The localized label, or the raw value humanized if unknown.
   */
  protected equipmentTypeLabelOf(equipmentType: string): string {
    return (
      this.equipmentTypeOptions().find((option) => option.value === equipmentType)?.label ??
      equipmentType.replaceAll('_', ' ')
    );
  }

  /**
   * Method overrideLabelOf
   *
   * @description
   * The schedule's interval override, humanized through the duration catalog, or `null` when it
   * follows the organization default.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {MaintenanceScheduleOutput} item - The rendered schedule.
   *
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
   *
   * @description
   * Whether a schedule is tracked but has never had an inspection recorded — `overdue` with no
   * `nextDueAt` — the state the contract requires an explicit label for.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {MaintenanceScheduleOutput} item - The rendered schedule.
   *
   * @returns {boolean} `true` for the never-inspected state.
   */
  protected isNeverInspected(item: MaintenanceScheduleOutput): boolean {
    return !item.nextDueAt && item.dueStatus === 'overdue';
  }

  /**
   * Method columnCount
   *
   * @description
   * How many cells a row has, so a full-width message can span them. The actions column only exists
   * with {@link canManage}.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {number} The rendered column count.
   */
  protected columnCount(): number {
    return this.canManage() ? 7 : 6;
  }

  /**
   * Method nextDueRelativeLabelOf
   *
   * @description
   * `item.nextDueAt` as a localized "today"/"in N days"/"N days ago" suffix.
   * Unlike `dueAt`/`plannedStartAt` elsewhere, `nextDueAt` is a real instant
   * — the last inspection's closure time plus the effective interval — so
   * both halves of the comparison are resolved to the organization's
   * timezone through {@link calendarDateIn} before being compared as
   * calendar days, matching the `'date'` mode used alongside it in the same
   * cell. `null` when the schedule carries no next-due date.
   *
   * @access protected
   * @since 2.1.0
   *
   * @param {MaintenanceScheduleOutput} item - The rendered schedule.
   *
   * @returns {string | null} The localized relative label, or `null`.
   */
  protected nextDueRelativeLabelOf(item: MaintenanceScheduleOutput): string | null {
    if (!item.nextDueAt) return null;

    const timezone: string = this.regionalFormatting().timezone;
    const today: string = this.calendarDateIn(new Date().toISOString(), timezone);
    const dueDay: string = this.calendarDateIn(item.nextDueAt, timezone);

    return formatRelativeDays(dueDay, today, this.locale);
  }

  /**
   * Method evaluationTooltipOf
   *
   * @description
   * The desktop status badge's tooltip text: the last server evaluation
   * timestamp, or the pending label when none has run yet, followed by
   * {@link reminderLabelOf} when a due-soon/overdue reminder was sent —
   * joined so both facts surface from one focusable host.
   *
   * @access protected
   * @since 2.1.0
   *
   * @param {MaintenanceScheduleOutput} item - The rendered schedule.
   *
   * @returns {string} The tooltip text.
   */
  protected evaluationTooltipOf(item: MaintenanceScheduleOutput): string {
    const evaluatedLabel: string = item.evaluatedAt
      ? $localize`:@@maintenance.evaluation.tooltipAt:Evaluated ${this.orgDatePipe.transform(item.evaluatedAt, 'datetime', this.regionalFormatting())}:date:`
      : $localize`:@@maintenance.evaluation.pending:Not yet evaluated`;

    const reminderLabel: string | null = this.reminderLabelOf(item);

    return reminderLabel ? `${evaluatedLabel} · ${reminderLabel}` : evaluatedLabel;
  }

  /**
   * Method reminderLabelOf
   *
   * @description
   * `item.lastRemindedAt` as a localized "Reminder sent {date}" line, shown
   * only for a `due_soon`/`overdue` schedule — a reminder recorded against a
   * schedule since brought up to date carries no operational meaning.
   *
   * @access protected
   * @since 2.1.0
   *
   * @param {MaintenanceScheduleOutput} item - The rendered schedule.
   *
   * @returns {string | null} The reminder line, or `null`.
   */
  protected reminderLabelOf(item: MaintenanceScheduleOutput): string | null {
    if (!item.lastRemindedAt) return null;
    if (item.dueStatus !== 'due_soon' && item.dueStatus !== 'overdue') return null;

    return $localize`:@@maintenance.reminder.sentAt:Reminder sent ${this.orgDatePipe.transform(item.lastRemindedAt, 'datetime', this.regionalFormatting())}:date:`;
  }

  /**
   * Method calendarDateIn
   *
   * @description
   * The `YYYY-MM-DD` calendar day an instant falls on within the given timezone, falling back to
   * the instant's own written date when the timezone identifier is not one `Intl.DateTimeFormat`
   * accepts (a fixed `+HHMM` offset).
   *
   * @access private
   * @since 2.1.0
   *
   * @param {string} instantIso - The ISO instant to resolve.
   * @param {string} timezone - An IANA timezone name, `'UTC'`, or a fixed offset.
   *
   * @returns {string} The resolved `YYYY-MM-DD` calendar day.
   */
  private calendarDateIn(instantIso: string, timezone: string): string {
    try {
      return new Intl.DateTimeFormat('en-CA', { timeZone: timezone })
        .format(new Date(instantIso))
        .slice(0, 10);
    } catch {
      return instantIso.slice(0, 10);
    }
  }
  //#endregion
}
