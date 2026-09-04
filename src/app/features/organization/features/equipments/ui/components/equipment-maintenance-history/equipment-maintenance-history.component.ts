import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  LOCALE_ID,
  type InputSignal,
  type Signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowRightLeft, lucideHistory, lucideWrench } from '@ng-icons/lucide';
import type {
  EquipmentMaintenanceLogOutput,
  EquipmentMaintenanceLogSource,
} from '@features/organization/features/equipments/models';
import { HlmCardImports } from '@shared/ui/card';
import { HlmEmptyImports } from '@shared/ui/empty';
import { HlmSkeleton } from '@shared/ui/skeleton';

/**
 * Component EquipmentMaintenanceHistory
 * @class EquipmentMaintenanceHistory
 *
 * @description
 * The equipment's maintenance log, read-only, newest-first: each entry's
 * start/completion dates, a source icon-and-label pair (never colour alone —
 * `PRODUCT.md`), the recorded summary when present, and a link to the
 * originating intervention (`FG-{interventionNumber}`) when `interventionId`
 * is present. `source` is a closed two-value union, so
 * {@link sourceDescriptorOf} is total rather than carrying an unreachable
 * fallback branch. Purely presentational (`ARCHITECTURE.md` §10.3): it owns
 * no store and calls no service; the page owns the load.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-equipment-maintenance-history
 *   [organizationId]="organizationId()"
 *   [logs]="store.maintenanceLogs()"
 *   [loading]="store.isLoadingMaintenanceLogs()"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-equipment-maintenance-history',
  imports: [NgIcon, ...HlmEmptyImports, RouterLink, ...HlmCardImports, HlmSkeleton],
  providers: [provideIcons({ lucideArrowRightLeft, lucideHistory, lucideWrench })],
  templateUrl: './equipment-maintenance-history.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EquipmentMaintenanceHistory {
  //#region Inputs
  /**
   * Property organizationId
   * @readonly
   * @description The workspace owning this equipment, used to build the intervention link.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string>}
   */
  public readonly organizationId: InputSignal<string> = input.required<string>();

  /**
   * Property logs
   * @readonly
   * @description The loaded maintenance log entries, any order — this component sorts newest-first.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly EquipmentMaintenanceLogOutput[]>}
   */
  public readonly logs: InputSignal<readonly EquipmentMaintenanceLogOutput[]> = input<
    readonly EquipmentMaintenanceLogOutput[]
  >([]);

  /**
   * Property loading
   * @readonly
   * @description Whether the log list is still loading.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly loading: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Properties
  /** The application's language, used to format each entry's dates. */
  private readonly locale: string = inject<string>(LOCALE_ID);

  /** {@link logs}, newest-first by `startedAt`. */
  protected readonly orderedLogs: Signal<readonly EquipmentMaintenanceLogOutput[]> = computed(() =>
    this.logs().toSorted(
      (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
    ),
  );

  /** One date/time formatter, shared across every row. */
  private readonly dateFormat: Intl.DateTimeFormat = new Intl.DateTimeFormat(this.locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  //#endregion

  //#region Methods
  /**
   * Method dateRangeOf
   * @description The entry's formatted start date, and its completion date when present.
   * @access protected
   * @since 1.0.0
   * @param {EquipmentMaintenanceLogOutput} log - The row's entry.
   * @returns {{ readonly started: string; readonly completed: string | null }} The formatted dates.
   */
  protected dateRangeOf(log: EquipmentMaintenanceLogOutput): {
    readonly started: string;
    readonly completed: string | null;
  } {
    return {
      started: this.dateFormat.format(new Date(log.startedAt)),
      completed: log.completedAt ? this.dateFormat.format(new Date(log.completedAt)) : null,
    };
  }

  /**
   * Method sourceDescriptorOf
   *
   * @description
   * The icon and label naming what triggered the entry. `EquipmentMaintenanceLogSource`
   * is a closed two-value union, so this `switch` is exhaustive and carries no
   * fallback branch — a third source value is a compile error here, not a
   * silently-swallowed one.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {EquipmentMaintenanceLogSource} source - The entry's source.
   *
   * @returns {{ readonly icon: string; readonly label: string }} The icon name and localized label.
   */
  protected sourceDescriptorOf(source: EquipmentMaintenanceLogSource): {
    readonly icon: string;
    readonly label: string;
  } {
    switch (source) {
      case 'status_transition':
        return {
          icon: 'lucideArrowRightLeft',
          label: $localize`:@@equipment.maintenance.source.statusTransition:Status change`,
        };
      case 'intervention':
        return {
          icon: 'lucideWrench',
          label: $localize`:@@equipment.maintenance.source.intervention:Intervention`,
        };
    }
  }

  /**
   * Method interventionLinkAriaLabelOf
   * @description The intervention link's accessible name — the bare FG-number alone reads ambiguously in an out-of-context link list.
   * @access protected
   * @since 1.1.0
   * @param {EquipmentMaintenanceLogOutput} log - The row's log entry.
   * @returns {string} The localized label.
   */
  protected interventionLinkAriaLabelOf(log: EquipmentMaintenanceLogOutput): string {
    const number: number = log.interventionNumber ?? 0;

    return $localize`:@@equipment.maintenance.interventionLinkAria:View intervention FG-${number}:number:`;
  }
  //#endregion
}
