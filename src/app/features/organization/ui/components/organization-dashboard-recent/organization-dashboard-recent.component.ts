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
import { InterventionTag } from '@features/organization/features/interventions/ui/components';
import type { OrganizationDashboardRecentIntervention } from '@features/organization/models';
import { getOrganizationInitials } from '@features/organization/utils';
import { CollectionSkeletonCards, CollectionSkeletonRows } from '@shared/collection-surface';
import { OrgDatePipe, type RegionalFormatSettings } from '@shared/regional-format';
import { formatRelativeDays, formatRelativeTime } from '@shared/relative-time';
import { ResourceIllustration } from '@shared/resource-illustration';
import { HlmAvatarImports } from '@shared/ui/avatar';
import { HlmButton } from '@shared/ui/button';
import { HlmCardImports } from '@shared/ui/card';
import { HlmEmptyImports } from '@shared/ui/empty';
import { HlmItemImports } from '@shared/ui/item';
import { HlmTableImports } from '@shared/ui/table';
import { HlmTooltip } from '@shared/ui/tooltip';
/**
 * Component OrganizationDashboardRecent
 * @class OrganizationDashboardRecent
 * @description Five API-ordered recent interventions, as a desktop table or mobile list. Navigation uses the permission-checked organization supplied by the page.
 * @version 1.1.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-dashboard-recent',
  imports: [
    OrgDatePipe,
    RouterLink,
    InterventionTag,
    CollectionSkeletonCards,
    CollectionSkeletonRows,
    HlmButton,
    HlmTooltip,
    ResourceIllustration,
    ...HlmTableImports,
    ...HlmCardImports,
    ...HlmEmptyImports,
    ...HlmItemImports,
    ...HlmAvatarImports,
  ],
  templateUrl: './organization-dashboard-recent.component.html',
  host: { class: 'block min-w-0' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationDashboardRecent {
  /**
   * Property rows
   * @readonly
   * @description Embedded records; missing payload stays distinct from an empty collection.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly OrganizationDashboardRecentIntervention[] | null>}
   */
  public readonly rows: InputSignal<readonly OrganizationDashboardRecentIntervention[] | null> =
    input.required<readonly OrganizationDashboardRecentIntervention[] | null>();

  /**
   * Property organizationId
   * @readonly
   * @description Organization with intervention read permission.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string>}
   */
  public readonly organizationId: InputSignal<string> = input.required<string>();

  /**
   * Property loading
   * @readonly
   * @description Initial aggregate request state.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly loading: InputSignal<boolean> = input(false);

  /**
   * Property regionalFormatting
   * @readonly
   * @description The active organization's date pattern and timezone, forwarded by the page for the "Updated"/"Due" `appOrgDate` bindings.
   * @access public
   * @since 1.1.0
   * @type {InputSignal<RegionalFormatSettings>}
   */
  public readonly regionalFormatting: InputSignal<RegionalFormatSettings> =
    input.required<RegionalFormatSettings>();

  /**
   * Property visibleRows
   * @readonly
   * @description Maximum five rows in backend recency order.
   * @access protected
   * @since 1.0.0
   * @type {Signal<readonly OrganizationDashboardRecentIntervention[]>}
   */
  protected readonly visibleRows: Signal<readonly OrganizationDashboardRecentIntervention[]> =
    computed(() => this.rows()?.slice(0, 5) ?? []);

  /**
   * Property locale
   * @readonly
   * @description Active application locale, used by the relative-time formatters.
   * @access private
   * @since 1.1.0
   * @type {string}
   */
  private readonly locale: string = inject(LOCALE_ID);

  /**
   * Property getInitials
   * @readonly
   * @description Resolves a member name into its 1–2 letter avatar fallback.
   * @access protected
   * @since 1.1.0
   * @type {typeof getOrganizationInitials}
   */
  protected readonly getInitials: typeof getOrganizationInitials = getOrganizationInitials;

  /**
   * Method formatUpdated
   * @description Renders `updatedAt` as a localized relative label ("3 hours ago").
   * @access protected
   * @since 1.1.0
   * @param {string} updatedAt - ISO 8601 last-modification timestamp.
   * @returns {string} The relative label.
   */
  protected formatUpdated(updatedAt: string): string {
    return formatRelativeTime(updatedAt, this.locale);
  }

  /**
   * Method formatDueRelative
   * @description Renders `dueAt` as a day-granular relative label ("in 3 days"), `today` resolved in the organization's timezone.
   * @access protected
   * @since 1.1.0
   * @param {string} dueAt - Due date, `'YYYY-MM-DD'` or a UTC-midnight instant.
   * @returns {string} The relative label.
   */
  protected formatDueRelative(dueAt: string): string {
    return formatRelativeDays(dueAt, this.todayIsoInTimezone(), this.locale);
  }

  /**
   * Method isPriorityNotable
   * @description Whether a row's priority is worth its own tag — the default `normal` priority renders no tag, keeping the row uncluttered.
   * @access protected
   * @since 1.2.0
   * @param {string} priority - The row's raw priority value.
   * @returns {boolean} Whether the priority tag should render.
   */
  protected isPriorityNotable(priority: string): boolean {
    return priority !== 'normal';
  }

  /**
   * Method todayIsoInTimezone
   * @description Today's calendar day in the organization's timezone, as `'YYYY-MM-DD'` — falls back to the runtime's own day for an unresolvable zone.
   * @access private
   * @since 1.1.0
   * @returns {string} Today's date, `'YYYY-MM-DD'`.
   */
  private todayIsoInTimezone(): string {
    try {
      const parts: ReadonlyArray<Intl.DateTimeFormatPart> = new Intl.DateTimeFormat('en-CA', {
        timeZone: this.regionalFormatting().timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).formatToParts(new Date());
      const partValue = (type: Intl.DateTimeFormatPartTypes): string =>
        parts.find((part) => part.type === type)?.value ?? '';

      return `${partValue('year')}-${partValue('month')}-${partValue('day')}`;
    } catch {
      return new Date().toISOString().slice(0, 10);
    }
  }
}
