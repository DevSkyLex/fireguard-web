import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  input,
  model,
  signal,
  untracked,
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';
import { OrganizationPermissionService } from '@features/organization/access';
import { FacilityOptionPicker } from '@features/organization/features/facilities/ui/components';
import { ServiceRequestTargetStore } from '@features/organization/features/service-requests/state';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
/**
 * Class ServiceRequestSitePicker
 * @class ServiceRequestSitePicker
 *
 * @description
 * Browser-only root-site chooser reusing the Facility-owned native picker.
 *
 * @since unreleased
 */
@Component({
  selector: 'app-service-request-site-picker',
  templateUrl: './service-request-site-picker.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ServiceRequestTargetStore],
  imports: [FacilityOptionPicker],
})
export class ServiceRequestSitePicker implements FormValueControl<string> {
  //#region Properties
  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Organization authority shared by the owning route and server transport.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string>}
   */
  public readonly organizationId = input.required<string>();
  /**
   * Property inputId
   * @readonly
   *
   * @description
   * Associates the native label with the picker input.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string>}
   */
  public readonly inputId = input('service-request-site');
  /**
   * Property value
   * @readonly
   *
   * @description
   * Opaque target identity; the empty string represents no selection.
   *
   * @access public
   * @since unreleased
   *
   * @type {ModelSignal<string>}
   */
  public readonly value = model('');
  /**
   * Property disabled
   * @readonly
   *
   * @description
   * Disables target changes without erasing their retained label.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly disabled = input(false);
  /**
   * Property store
   * @readonly
   *
   * @description
   * Component-owned request workflow state.
   *
   * @access protected
   * @since unreleased
   *
   * @type {ServiceRequestStoreType}
   */
  protected readonly store = inject(ServiceRequestTargetStore);
  /**
   * Property platformId
   * @readonly
   *
   * @description
   * Browser guard for secondary authenticated reads.
   *
   * @access private
   * @since unreleased
   *
   * @type {object}
   */
  private readonly platformId = inject(PLATFORM_ID);
  /**
   * Property permissions
   * @readonly
   *
   * @description
   * API-derived organization permission authority.
   *
   * @access private
   * @since unreleased
   *
   * @type {OrganizationPermissionService}
   */
  private readonly permissions = inject(OrganizationPermissionService);
  /**
   * Property canRead
   * @readonly
   *
   * @description
   * Permission gate for the owned resource reads.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly canRead = computed(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.FACILITIES_READ),
  );
  /**
   * Property searchTerm
   * @readonly
   *
   * @description
   * Remote picker search; filtering never silently changes server pagination.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<string>}
   */
  protected readonly searchTerm = signal('');
  /**
   * Property page
   * @readonly
   *
   * @description
   * Current server page, starting at one.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<number>}
   */
  protected readonly page = signal(1);
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Connects browser-only root-site search and independent retained-selection hydration.
   *
   * @access public
   * @since unreleased
   */
  public constructor() {
    effect(() => {
      this.organizationId();
      untracked(() => {
        this.page.set(1);
        this.searchTerm.set('');
      });
    });
    effect(() => {
      const organizationId = this.organizationId(),
        page = this.page(),
        search = this.searchTerm();
      const enabled = organizationId && this.canRead() && isPlatformBrowser(this.platformId);
      untracked(() => this.store.loadSites(enabled ? { organizationId, page, search } : null));
    });
    effect(() => {
      const organizationId = this.organizationId(),
        siteId = this.value();
      const enabled =
        siteId && organizationId && this.canRead() && isPlatformBrowser(this.platformId);
      untracked(() => this.store.readSite(enabled ? { organizationId, siteId } : null));
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method search
   *
   * @description
   * Commits remote target search and returns pagination to its first page.
   *
   * @access protected
   * @since unreleased
   *
   * @param {string} value - Native choice value validated against the current options.
   *
   * @returns {void} Result owned by the request workflow.
   */
  protected search(value: string): void {
    this.page.set(1);
    this.searchTerm.set(value);
  }
  //#endregion
}
