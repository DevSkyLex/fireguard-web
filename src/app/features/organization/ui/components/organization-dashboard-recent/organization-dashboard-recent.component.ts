import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  type InputSignal,
  type Signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { InterventionTag } from '@features/organization/features/interventions/ui/components';
import type { OrganizationDashboardRecentIntervention } from '@features/organization/models';
import { CollectionSkeletonCards, CollectionSkeletonRows } from '@shared/collection-surface';
import { HlmAvatarImports } from '@shared/ui/avatar';
import { HlmButton } from '@shared/ui/button';
import { HlmCardImports } from '@shared/ui/card';
import { HlmEmptyImports } from '@shared/ui/empty';
import { HlmItemImports } from '@shared/ui/item';
import { HlmTableImports } from '@shared/ui/table';
/**
 * Component OrganizationDashboardRecent
 * @class OrganizationDashboardRecent
 * @description Five API-ordered recent interventions, as a desktop table or mobile list. Navigation uses the permission-checked organization supplied by the page.
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-dashboard-recent',
  imports: [
    DatePipe,
    RouterLink,
    InterventionTag,
    CollectionSkeletonCards,
    CollectionSkeletonRows,
    HlmButton,
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
   * Property visibleRows
   * @readonly
   * @description Maximum five rows in backend recency order.
   * @access protected
   * @since 1.0.0
   * @type {Signal<readonly OrganizationDashboardRecentIntervention[]>}
   */
  protected readonly visibleRows: Signal<readonly OrganizationDashboardRecentIntervention[]> =
    computed(() => this.rows()?.slice(0, 5) ?? []);
}
