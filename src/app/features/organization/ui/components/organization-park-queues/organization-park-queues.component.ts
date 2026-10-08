import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  type InputSignal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { provideIcons } from '@ng-icons/core';
import { lucideWrench, lucideClipboardCheck, lucideTriangleAlert } from '@ng-icons/lucide';
import type { CallState } from '@core/request-state';
import { OrganizationPermissionService } from '@features/organization/access';
import { CustomerPicker } from '@features/organization/features/customers/ui/components';
import { FacilityOptionPicker } from '@features/organization/features/facilities/ui/components';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import {
  OrganizationParkStore,
  type OrganizationParkStoreType,
} from '@features/organization/state/organization-park';
import { HlmAlertImports } from '@shared/ui/alert';
import { HlmButton } from '@shared/ui/button';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmToggleGroupImports } from '@shared/ui/toggle-group';
import { HlmLarge } from '@shared/ui/typography';
import { StatTile } from '../stat-tile';

/**
 * Class OrganizationParkQueues
 * @class OrganizationParkQueues
 *
 * @description
 * Server-scoped queues lead the dashboard without altering its organization-wide activity charts.
 *
 * @since unreleased
 */
@Component({
  selector: 'app-organization-park-queues',
  templateUrl: './organization-park-queues.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    OrganizationParkStore,
    provideIcons({ lucideWrench, lucideClipboardCheck, lucideTriangleAlert }),
  ],
  imports: [
    CustomerPicker,
    FacilityOptionPicker,
    StatTile,
    HlmButton,
    HlmLarge,
    ...HlmFieldImports,
    ...HlmAlertImports,
    ...HlmToggleGroupImports,
  ],
})
export class OrganizationParkQueues {
  //#region Properties
  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Organization selected by the owning page.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string>}
   */
  public readonly organizationId: InputSignal<string> = input.required<string>();
  /**
   * Property permissions
   * @readonly
   *
   * @description
   * Equipment projections have their own grant, separate from findings.
   *
   * @access protected
   * @since unreleased
   *
   * @type {OrganizationPermissionService}
   */
  protected readonly permissions: OrganizationPermissionService = inject(
    OrganizationPermissionService,
  );
  /**
   * Property store
   * @readonly
   *
   * @description
   * Component-scoped count and site-picker state.
   *
   * @access protected
   * @since unreleased
   *
   * @type {OrganizationParkStoreType}
   */
  protected readonly store: OrganizationParkStoreType = inject(OrganizationParkStore);
  /**
   * Property platformId
   * @readonly
   *
   * @description
   * Secondary scoped queues do not initiate authenticated reads during SSR.
   *
   * @access private
   * @since unreleased
   *
   * @type {object}
   */
  private readonly platformId: object = inject(PLATFORM_ID);
  /**
   * Property family
   * @readonly
   *
   * @description
   * Fire-only is the default product scope.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<'fire' | 'all'>}
   */
  protected readonly family: WritableSignal<'fire' | 'all'> = signal('fire');
  /**
   * Property customerId
   * @readonly
   *
   * @description
   * Optional customer context; empty means all permitted customers.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<string>}
   */
  protected readonly customerId: WritableSignal<string> = signal('');
  /**
   * Property facilityId
   * @readonly
   *
   * @description
   * Selected root site and its descendants.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<string>}
   */
  protected readonly facilityId: WritableSignal<string> = signal('');
  /**
   * Property canReadCustomers
   * @readonly
   *
   * @description
   * Directory choices are available only with their read grants.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly canReadCustomers: Signal<boolean> = computed(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.CUSTOMERS_READ),
  );
  /**
   * Property canReadSites
   * @readonly
   *
   * @description
   * Root sites are independently gated.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly canReadSites: Signal<boolean> = computed(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.FACILITIES_READ),
  );
  /**
   * Property canReadEquipment
   * @readonly
   *
   * @description
   * Equipment queue counts require their owning read grant.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly canReadEquipment: Signal<boolean> = computed(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.EQUIPMENT_READ),
  );
  /**
   * Property canReadAnomalies
   * @readonly
   *
   * @description
   * Finding queue counts require inspection and equipment read grants.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly canReadAnomalies: Signal<boolean> = computed(
    () =>
      this.permissions.hasPermission(ORGANIZATION_PERMISSION.INSPECTION_READ) &&
      this.permissions.hasPermission(ORGANIZATION_PERMISSION.EQUIPMENT_READ),
  );
  /**
   * Property sitePickerCallState
   * @readonly
   *
   * @description
   * Candidate control consumes status and error, while the store retains the typed collection.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<CallState>}
   */
  protected readonly sitePickerCallState: Signal<CallState> = computed(() => ({
    ...this.store.sitesCallState(),
    data: null,
  }));
  /**
   * Property destinationParams
   * @readonly
   *
   * @description
   * Exact destination query shared with the counts.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<Readonly<Record<string, string>>>}
   */
  protected readonly destinationParams: Signal<Readonly<Record<string, string>>> = computed(() => ({
    axis: this.facilityId() ? 'site' : 'everything',
    family: this.family(),
    ...(this.customerId() ? { customerId: this.customerId() } : {}),
    ...(this.facilityId() ? { facility: this.facilityId(), equipmentScope: 'subtree' } : {}),
  }));
  /**
   * Property unavailableParams
   * @readonly
   *
   * @description
   * Each queue link preserves exactly the filters used by its server count.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<Readonly<Record<string, string>>>}
   */
  protected readonly unavailableParams: Signal<Readonly<Record<string, string>>> = computed(() => ({
    ...this.destinationParams(),
    queue: 'unavailable',
  }));
  /**
   * Property controlsParams
   * @readonly
   *
   * @description
   * Due-soon and overdue are one server-filtered destination.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<Readonly<Record<string, string>>>}
   */
  protected readonly controlsParams: Signal<Readonly<Record<string, string>>> = computed(() => ({
    ...this.destinationParams(),
    queue: 'controls',
  }));
  /**
   * Property anomaliesParams
   * @readonly
   *
   * @description
   * The unresolved anomaly list uses the same customer and root-site scope.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<Readonly<Record<string, string>>>}
   */
  protected readonly anomaliesParams: Signal<Readonly<Record<string, string>>> = computed(() => ({
    ...this.destinationParams(),
    queue: 'anomalies',
  }));
  /**
   * Property parkRoute
   * @readonly
   *
   * @description
   * Park navigation requires the site read grant enforced by the assets route.
   * Counts remain readable without offering an unauthorized destination.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<readonly string[] | null>}
   */
  protected readonly parkRoute: Signal<readonly string[] | null> = computed(() =>
    this.canReadSites() ? ['/organizations', this.organizationId(), 'assets'] : null,
  );
  /**
   * Property unavailable
   * @readonly
   *
   * @description
   * Unknown, denied or failed reads never become a zero.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<number | string>}
   */
  protected readonly unavailable: Signal<number | string> = computed(
    () => this.store.unavailableCallState().data ?? '—',
  );
  /**
   * Property controls
   * @readonly
   *
   * @description
   * Count is the server's single due-soon and overdue union.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<number | string>}
   */
  protected readonly controls: Signal<number | string> = computed(
    () => this.store.controlsCallState().data ?? '—',
  );
  /**
   * Property anomalies
   * @readonly
   *
   * @description
   * Count is open and in-progress anomalies, independent of inspection completion.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<number | string>}
   */
  protected readonly anomalies: Signal<number | string> = computed(
    () => this.store.anomaliesCallState().data ?? '—',
  );
  /**
   * Property allSites
   * @readonly
   *
   * @description
   * Site picker empty choice is a scope filter, not a parent assignment.
   *
   * @access protected
   * @since unreleased
   *
   * @type {string}
   */
  protected readonly allSites: string = $localize`:@@park.context.allSites:All sites`;
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Resets per-organization filter drafts and cancels obsolete scoped requests.
   *
   * @access public
   * @since unreleased
   */
  public constructor() {
    effect(() => {
      this.organizationId();
      untracked(() => {
        this.customerId.set('');
        this.facilityId.set('');
        this.family.set('fire');
      });
    });
    effect(() => {
      const organizationId = this.organizationId(),
        family = this.family(),
        customerId = this.customerId(),
        facilityId = this.facilityId();
      const equipmentEnabled = this.canReadEquipment(),
        anomaliesEnabled = this.canReadAnomalies();
      untracked(() =>
        this.store.load(
          isPlatformBrowser(this.platformId)
            ? {
                organizationId,
                ...(family === 'fire' ? { family } : {}),
                ...(customerId ? { customerId } : {}),
                ...(facilityId ? { facilityId } : {}),
                equipmentEnabled,
                anomaliesEnabled,
              }
            : null,
        ),
      );
    });
    effect(() => {
      const organizationId = this.organizationId(),
        customerId = this.customerId(),
        enabled = this.canReadSites() && this.canReadEquipment();
      untracked(() =>
        this.store.loadSites(
          enabled && isPlatformBrowser(this.platformId)
            ? { organizationId, ...(customerId ? { customerId } : {}) }
            : null,
        ),
      );
    });
    effect(() => {
      const organizationId = this.organizationId(),
        facilityId = this.facilityId(),
        enabled = this.canReadSites();
      untracked(() =>
        this.store.readSite(
          enabled && facilityId && isPlatformBrowser(this.platformId)
            ? { organizationId, facilityId }
            : null,
        ),
      );
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method familyChanged
   * @method
   *
   * @description
   * Toggles the complete park without rewriting equipment type classifications.
   *
   * @access protected
   * @since unreleased
   *
   * @param {unknown} value - Value supplied by the owning park workflow.
   *
   * @returns {void} No return value.
   */
  protected familyChanged(value: unknown): void {
    if (value === 'fire' || value === 'all') this.family.set(value);
  }
  /**
   * Method customerChanged
   * @method
   *
   * @description
   * Clears a selected site before changing customer authority.
   *
   * @access protected
   * @since unreleased
   *
   * @param {string} value - Value supplied by the owning park workflow.
   *
   * @returns {void} No return value.
   */
  protected customerChanged(value: string): void {
    this.customerId.set(value);
    this.facilityId.set('');
  }
  /**
   * Method searchSites
   * @method
   *
   * @description
   * Searches root-site server pages in the retained customer context.
   *
   * @access protected
   * @since unreleased
   *
   * @param {string} search - Server search over root-site names and paths.
   *
   * @returns {void} No return value.
   */
  protected searchSites(search: string): void {
    this.store.loadSites({
      organizationId: this.organizationId(),
      ...(this.customerId() ? { customerId: this.customerId() } : {}),
      search,
      page: 1,
    });
  }
  /**
   * Method sitePage
   * @method
   *
   * @description
   * Pages and retries the same committed candidate search.
   *
   * @access protected
   * @since unreleased
   *
   * @param {number} page - One-based candidate page returned by the server.
   *
   * @returns {void} No return value.
   */
  protected sitePage(page: number): void {
    const query = this.store.siteQuery();
    if (query) this.store.loadSites({ ...query, page });
  }
  /**
   * Method retry
   * @method
   *
   * @description
   * Retries the same complete three-queue scope.
   *
   * @access protected
   * @since unreleased
   *
   * @returns {void} No return value.
   */
  protected retry(): void {
    this.store.load({
      organizationId: this.organizationId(),
      ...(this.family() === 'fire' ? { family: 'fire' } : {}),
      ...(this.customerId() ? { customerId: this.customerId() } : {}),
      ...(this.facilityId() ? { facilityId: this.facilityId() } : {}),
      equipmentEnabled: this.canReadEquipment(),
      anomaliesEnabled: this.canReadAnomalies(),
    });
  }
  //#endregion
}
