import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  signal,
  untracked,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCircleAlert, lucideCircleCheck, lucideCirclePause } from '@ng-icons/lucide';
import { OrganizationPermissionService } from '@features/organization/access';
import type { AutomationAttemptOutput } from '@features/organization/features/automations/models';
import {
  AutomationExecutionsStore,
  type AutomationExecutionsStoreType,
} from '@features/organization/features/automations/state';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import {
  ORGANIZATION_CONTEXT_PORT,
  REGIONAL_FORMATTING_PORT,
  type OrganizationContextPort,
  type RegionalFormattingPort,
} from '@features/organization/ports';
import { CollectionPagination } from '@shared/collection-pagination';
import { OrgDatePipe, type RegionalFormatSettings } from '@shared/regional-format';
import { ResourceIllustration } from '@shared/resource-illustration';
import { HlmAlertImports } from '@shared/ui/alert';
import { HlmBadge } from '@shared/ui/badge';
import { HlmButton } from '@shared/ui/button';
import { HlmEmptyImports } from '@shared/ui/empty';
import { HlmItemImports } from '@shared/ui/item';
import { HlmSkeleton } from '@shared/ui/skeleton';
import { HlmLarge } from '@shared/ui/typography';
import { AutomationStatusTag } from '../../components/automation-status-tag';

/** The execution history's fixed, server-set page size — the store exposes no other. */
const PAGE_SIZE: number = 20;

/**
 * Component AutomationsPage
 * @class AutomationsPage
 *
 * @description
 * Shows the effective automation policy and its server-counted execution
 * history: a flat `hlmItem` for the policy row, an `hlmItemGroup` for the
 * attempts, `app-collection-pagination` for paging, and `hlmAlert` for the
 * list and retry error boundaries. Each attempt names its subject by its
 * fixed domain label rather than a raw UUID, resolves its status through
 * `app-automation-status-tag`, and shows `finishedAt` once it exists.
 *
 * @version 1.1.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-automations-page',
  imports: [
    NgIcon,
    OrgDatePipe,
    RouterLink,
    AutomationStatusTag,
    CollectionPagination,
    HlmBadge,
    HlmButton,
    HlmSkeleton,
    HlmLarge,
    ResourceIllustration,
    ...HlmAlertImports,
    ...HlmEmptyImports,
    ...HlmItemImports,
  ],
  providers: [
    AutomationExecutionsStore,
    provideIcons({ lucideCircleAlert, lucideCircleCheck, lucideCirclePause }),
  ],
  templateUrl: './automations-page.component.html',
  host: { class: 'block w-full min-w-0' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AutomationsPage {
  /**
   * Property store
   * @readonly
   * @description Page-owned execution state.
   * @access protected
   * @since 1.0.0
   * @type {AutomationExecutionsStoreType}
   */
  protected readonly store: AutomationExecutionsStoreType = inject(AutomationExecutionsStore);

  /**
   * Property context
   * @readonly
   * @description Owning workspace context.
   * @access protected
   * @since 1.0.0
   * @type {OrganizationContextPort}
   */
  protected readonly context: OrganizationContextPort = inject(ORGANIZATION_CONTEXT_PORT);

  /**
   * Property permissions
   * @readonly
   * @description Access to the existing policy editor and created interventions.
   * @access protected
   * @since 1.0.0
   * @type {OrganizationPermissionService}
   */
  protected readonly permissions: OrganizationPermissionService = inject(
    OrganizationPermissionService,
  );

  /**
   * Property permission
   * @readonly
   * @description Named permission catalog.
   * @access protected
   * @since 1.0.0
   * @type {typeof ORGANIZATION_PERMISSION}
   */
  protected readonly permission: typeof ORGANIZATION_PERMISSION = ORGANIZATION_PERMISSION;

  /**
   * Property pageSizes
   * @readonly
   * @description The single, fixed page size {@link PAGE_SIZE} offers `app-collection-pagination`, which hides its rows-per-page selector for a one-entry list.
   * @access protected
   * @since 1.1.0
   * @type {readonly [number]}
   */
  protected readonly pageSizes: readonly [number] = [PAGE_SIZE];

  /**
   * Property regionalFormatting
   * @readonly
   * @description The active organization's date pattern and timezone, read by `appOrgDate` bindings.
   * @access protected
   * @since 1.1.0
   * @type {Signal<RegionalFormatSettings>}
   */
  protected readonly regionalFormatting: Signal<RegionalFormatSettings> =
    inject<RegionalFormattingPort>(REGIONAL_FORMATTING_PORT).regionalFormatting;

  /**
   * Property ready
   * @readonly
   * @description Defers secondary history until hydration.
   * @access private
   * @since 1.0.0
   * @type {WritableSignal<boolean>}
   */
  private readonly ready: WritableSignal<boolean> = signal(false);

  /**
   * Constructor
   * @constructor
   * @description Loads and clears history with browser workspace changes.
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    afterNextRender(() => this.ready.set(true));
    effect(() => {
      const organizationId = this.context.selectedOrganizationId();
      const ready = this.ready();
      untracked(() => this.store.load({ organizationId: ready ? organizationId : null, page: 1 }));
    });
  }

  /**
   * Method load
   * @description Reads the requested page or refreshes current progress.
   * @access protected
   * @since 1.0.0
   * @param {number} page - One-based history page.
   * @returns {void}
   */
  protected load(page: number): void {
    this.store.refresh(page);
  }

  /**
   * Method showsProgressHint
   * @description Whether an attempt is still running on the server, so the row should point to a refresh rather than a result.
   * @access protected
   * @since 1.2.0
   * @param {AutomationAttemptOutput} attempt - The rendered attempt.
   * @returns {boolean}
   */
  protected showsProgressHint(attempt: AutomationAttemptOutput): boolean {
    return attempt.status === 'pending' || attempt.status === 'running';
  }
}
