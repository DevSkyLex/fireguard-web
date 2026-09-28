import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronRight, lucideTriangleAlert } from '@ng-icons/lucide';
import type { OrganizationOutput } from '@features/organization/models';
import { OrganizationStore } from '@features/organization/state';
import { OrganizationAvatar } from '@features/organization/ui/components';
import { CollectionPagination } from '@shared/collection-pagination';
import { ResourceIllustration } from '@shared/resource-illustration';
import { HlmBadge } from '@shared/ui/badge';
import { HlmButton } from '@shared/ui/button';
import { HlmEmptyImports } from '@shared/ui/empty';
import { HlmItemImports } from '@shared/ui/item';
import { HlmSkeleton } from '@shared/ui/skeleton';

/** @description Number of skeleton rows shown while the first page is loading. */
const SKELETON_ROW_COUNT = 4;

/** @description Rows per page requested from the server; the select is single-sized. */
const PAGE_SIZE = 30;

/**
 * Component OrganizationSelectPage
 * @class OrganizationSelectPage
 * @description Lets the account choose among current server-authorized memberships. Browser-only
 * loading keeps this secondary collection out of SSR and hydration payloads.
 * @since 1.0.0
 */
@Component({
  selector: 'app-organization-select-page',
  imports: [
    RouterLink,
    NgIcon,
    HlmButton,
    HlmBadge,
    HlmItemImports,
    ...HlmEmptyImports,
    HlmSkeleton,
    OrganizationAvatar,
    ResourceIllustration,
    CollectionPagination,
  ],
  providers: [OrganizationStore, provideIcons({ lucideChevronRight, lucideTriangleAlert })],
  templateUrl: './organization-select-page.component.html',
  host: { class: 'block min-w-0' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationSelectPage {
  /**
   * Property store
   * @readonly
   * @description Route-scoped membership collection and request state.
   * @access protected
   * @since 1.0.0
   * @type {OrganizationStore}
   */
  protected readonly store: OrganizationStore = inject(OrganizationStore);
  /**
   * Property page
   * @readonly
   * @description Current server page; totals are never inferred from its rows.
   * @access protected
   * @since 1.0.0
   * @type {WritableSignal<number>}
   */
  protected readonly page: WritableSignal<number> = signal(1);
  /**
   * Property pageCount
   * @readonly
   * @description Total number of pages at the fixed {@link PAGE_SIZE}, for the shared pagination band.
   * @access protected
   * @since 1.1.0
   * @type {Signal<number>}
   */
  protected readonly pageCount: Signal<number> = computed(() =>
    Math.max(1, Math.ceil(this.store.totalOrganizations() / PAGE_SIZE)),
  );
  /**
   * Property skeletonRows
   * @readonly
   * @description Placeholder row indices rendered while the first page loads.
   * @access protected
   * @since 1.1.0
   * @type {readonly number[]}
   */
  protected readonly skeletonRows: readonly number[] = Array.from(
    { length: SKELETON_ROW_COUNT },
    (_, index) => index,
  );
  /**
   * Constructor
   * @constructor
   * @description Defers the selector query until browser rendering.
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    afterNextRender(() => this.load(1));
  }
  /**
   * Method load
   * @method load
   * @description Reads a page of accessible organizations from the server.
   * @access protected
   * @since 1.0.0
   * @param {number} page - One-based page to display.
   * @returns {void}
   */
  protected load(page: number): void {
    this.page.set(page);
    this.store.loadOrganizations({ page, itemsPerPage: PAGE_SIZE });
  }
  /**
   * Method firstRoleLabel
   * @method firstRoleLabel
   * @description The viewer's first assigned role label for a non-owned organization, or `null`.
   * @access protected
   * @since 1.1.0
   * @param {OrganizationOutput} organization - Row read from the loaded page.
   * @returns {string | null} The first role's label, or `null` when none is resolved.
   */
  protected firstRoleLabel(organization: OrganizationOutput): string | null {
    return organization.roles?.[0]?.label ?? null;
  }
}
