import {
  ChangeDetectionStrategy,
  Component,
  LOCALE_ID,
  inject,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Duration } from 'luxon';
import type { MaintenancePlanOutput } from '@features/organization/features/maintenance-schedules/models';
import {
  maintenancePlanDateMode,
  maintenancePlanDateValue,
} from '@features/organization/features/maintenance-schedules/utils';
import { OrgDatePipe, type RegionalFormatSettings } from '@shared/regional-format';
import { HlmBadge } from '@shared/ui/badge';
import { HlmButton } from '@shared/ui/button';
import { HlmItemImports } from '@shared/ui/item';

/**
 * Class MaintenancePlanList
 * @class MaintenancePlanList
 *
 * @description
 * Flat equipment operation list; dates, open occurrences and retry permission remain server-owned.
 */
@Component({
  selector: 'app-maintenance-plan-list',
  imports: [RouterLink, OrgDatePipe, HlmBadge, HlmButton, ...HlmItemImports],
  templateUrl: './maintenance-plan-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MaintenancePlanList {
  //#region Properties
  /**
   * Property localeId
   * @readonly
   *
   * @description
   * Formats the configured interval in the active interface language.
   *
   * @access private
   * @since unreleased
   *
   * @type {string}
   */
  private readonly localeId: string = inject(LOCALE_ID);

  /**
   * Property dateMode
   * @readonly
   *
   * @description
   * Keeps date-only calendar anchors independent from the viewer's timezone.
   *
   * @access protected
   * @since unreleased
   *
   * @type {typeof maintenancePlanDateMode}
   */
  protected readonly dateMode: typeof maintenancePlanDateMode = maintenancePlanDateMode;

  /**
   * Property dateValue
   * @readonly
   *
   * @description
   * Supplies the server's calendar day to date-only formatting without converting its offset.
   *
   * @access protected
   * @since unreleased
   *
   * @type {typeof maintenancePlanDateValue}
   */
  protected readonly dateValue: typeof maintenancePlanDateValue = maintenancePlanDateValue;

  /**
   * Property plans
   * @readonly
   *
   * @description
   * Current server-filtered page.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<readonly MaintenancePlanOutput[]>}
   */
  public readonly plans: InputSignal<readonly MaintenancePlanOutput[]> = input<
    readonly MaintenancePlanOutput[]
  >([]);

  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Organization for equipment and work links.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string>}
   */
  public readonly organizationId: InputSignal<string> = input.required<string>();

  /**
   * Property regionalFormatting
   * @readonly
   *
   * @description
   * Organization timezone and date settings.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<RegionalFormatSettings>}
   */
  public readonly regionalFormatting: InputSignal<RegionalFormatSettings> =
    input.required<RegionalFormatSettings>();

  /**
   * Property canManage
   * @readonly
   *
   * @description
   * Server-permission projection controls configuration actions.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly canManage: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property canGenerate
   * @readonly
   *
   * @description
   * Requires planning permission and confirmed plan authority.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly canGenerate: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property pending
   * @readonly
   *
   * @description
   * Accepted command prevents double submission.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property previewRequested
   * @readonly
   *
   * @description
   * Saved calendar chosen for review.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<MaintenancePlanOutput>}
   */
  public readonly previewRequested: OutputEmitterRef<MaintenancePlanOutput> =
    output<MaintenancePlanOutput>();

  /**
   * Property editRequested
   * @readonly
   *
   * @description
   * Explicit configuration request.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<MaintenancePlanOutput>}
   */
  public readonly editRequested: OutputEmitterRef<MaintenancePlanOutput> =
    output<MaintenancePlanOutput>();

  /**
   * Property generationRequested
   * @readonly
   *
   * @description
   * Work creation or recovery request.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<{ planId: string; retry: boolean }>}
   */
  public readonly generationRequested: OutputEmitterRef<{ planId: string; retry: boolean }> =
    output<{ planId: string; retry: boolean }>();
  //#endregion

  //#region Methods
  /**
   * Method durationLabel
   * @method durationLabel
   *
   * @description
   * Formats the configured duration without calculating occurrences or translating technical codes.
   *
   * @access protected
   * @since unreleased
   *
   * @param {string} interval - Server-configured ISO duration.
   *
   * @returns {string} Calendar units in the current interface language.
   */
  protected durationLabel(interval: string): string {
    const duration: Duration = Duration.fromISO(interval, { locale: this.localeId });
    return duration.isValid ? duration.toHuman({ listStyle: 'long', unitDisplay: 'long' }) : '—';
  }

  /**
   * Method operationLabel
   * @method operationLabel
   *
   * @description
   * Resolves control and maintenance without deriving operational or anomaly state.
   *
   * @access protected
   * @since unreleased
   *
   * @param {MaintenancePlanOutput} plan - Server plan.
   *
   * @returns {string} Operation label.
   */
  protected operationLabel(plan: MaintenancePlanOutput): string {
    return plan.operationKind === 'control'
      ? $localize`:@@maintenance.plans.control:Control`
      : $localize`:@@maintenance.plans.maintenance:Maintenance`;
  }

  /**
   * Method cadenceLabel
   * @method cadenceLabel
   *
   * @description
   * Explicitly identifies preserved historical recurrence.
   *
   * @access protected
   * @since unreleased
   *
   * @param {MaintenancePlanOutput} plan - Server cadence.
   *
   * @returns {string} Cadence label.
   */
  protected cadenceLabel(plan: MaintenancePlanOutput): string {
    return plan.cadenceMode === 'legacy'
      ? $localize`:@@maintenance.plans.legacyCadence:Historical cadence retained`
      : $localize`:@@maintenance.plans.fixedCadence:Anchored calendar`;
  }
  //#endregion
}
