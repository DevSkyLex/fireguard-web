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
import {
  EquipmentTypeCatalogStore,
  buildEquipmentTitle,
} from '@features/organization/features/equipments';
import type { EquipmentOutput } from '@features/organization/features/equipments/models';
import { ServiceRequestTargetStore } from '@features/organization/features/service-requests/state';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { HlmButton } from '@shared/ui/button';
import { HlmComboboxImports } from '@shared/ui/combobox';
/**
 * Class ServiceRequestEquipmentPicker
 * @class ServiceRequestEquipmentPicker
 *
 * @description
 * Browser-only published-equipment chooser with site subtree scope and retained-selection
 * hydration.
 *
 * @since unreleased
 */
@Component({
  selector: 'app-service-request-equipment-picker',
  templateUrl: './service-request-equipment-picker.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ServiceRequestTargetStore, EquipmentTypeCatalogStore],
  imports: [HlmButton, ...HlmComboboxImports],
})
export class ServiceRequestEquipmentPicker implements FormValueControl<string> {
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
   * Property siteId
   * @readonly
   *
   * @description
   * Root-site target or scope; qualification choices stay inside this site.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string>}
   */
  public readonly siteId = input<string>('');
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
  public readonly inputId = input('service-request-equipment');
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
   * Property catalogue
   * @readonly
   *
   * @description
   * Authorized catalogue labels including retained historical equipment types.
   *
   * @access protected
   * @since unreleased
   *
   * @type {EquipmentTypeCatalogStoreType}
   */
  protected readonly catalogue = inject(EquipmentTypeCatalogStore);
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
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.EQUIPMENT_READ),
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
  /**
   * Property placeholder
   * @readonly
   *
   * @description
   * Localized accessible target-choice prompt.
   *
   * @access protected
   * @since unreleased
   *
   * @type {string | undefined}
   */
  protected readonly placeholder = $localize`:@@serviceRequest.target.equipmentPlaceholder:Choose equipment`;
  /**
   * Property labelOf
   * @readonly
   *
   * @description
   * Retained-selection label hydrated independently of current search results.
   *
   * @access protected
   * @since unreleased
   *
   * @type {(value: unknown) => string}
   */
  protected readonly labelOf = (value: unknown): string => {
    if (typeof value !== 'string' || !value)
      return $localize`:@@serviceRequest.target.noEquipment:No equipment selected`;
    const selected = this.store.selectedEquipmentCallState().data;
    const record =
      selected?.id === value
        ? selected
        : this.store.equipmentEntities().find((entry) => entry.id === value);
    return record ? this.title(record) : value;
  };
  /**
   * Property remoteFilter
   * @readonly
   *
   * @description
   * Server-owned candidate search keeps authorized page entries visible.
   *
   * @access protected
   * @since unreleased
   *
   * @type {() => boolean}
   */
  protected readonly remoteFilter = (): boolean => true;
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Connects browser-only candidate search, catalogue labels and independent retained-selection
   * reads.
   *
   * @access public
   * @since unreleased
   */
  public constructor() {
    effect(() => {
      this.organizationId();
      this.siteId();
      untracked(() => {
        this.page.set(1);
        this.searchTerm.set('');
      });
    });
    effect(() => {
      const organizationId = this.organizationId(),
        siteId = this.siteId(),
        page = this.page(),
        search = this.searchTerm();
      const enabled = organizationId && this.canRead() && isPlatformBrowser(this.platformId);
      untracked(() => {
        this.store.loadEquipment(
          enabled ? { organizationId, siteId: siteId || undefined, page, search } : null,
        );
        if (enabled && this.catalogue.organizationId() !== organizationId)
          this.catalogue.load(organizationId);
      });
    });
    effect(() => {
      const organizationId = this.organizationId(),
        equipmentId = this.value();
      const enabled =
        equipmentId && organizationId && this.canRead() && isPlatformBrowser(this.platformId);
      untracked(() => this.store.readEquipment(enabled ? { organizationId, equipmentId } : null));
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method title
   *
   * @description
   * Builds the equipment title with its authorized catalogue label.
   *
   * @access protected
   * @since unreleased
   *
   * @param {EquipmentOutput} equipment - Authorized published equipment projection.
   *
   * @returns {string} Localized human-readable request value.
   */
  protected title(equipment: EquipmentOutput): string {
    return buildEquipmentTitle(
      equipment,
      this.catalogue.options().find((entry) => entry.value === equipment.type)?.label,
    );
  }
  /**
   * Method selectable
   *
   * @description
   * Retired and draft equipment remain readable but cannot be newly chosen.
   *
   * @access protected
   * @since unreleased
   *
   * @param {EquipmentOutput} equipment - Authorized published equipment projection.
   *
   * @returns {boolean} Result owned by the request workflow.
   */
  protected selectable(equipment: EquipmentOutput): boolean {
    return equipment.status !== 'decommissioned' && equipment.recordStatus !== 'draft';
  }
  /**
   * Method pick
   *
   * @description
   * Accepts only an authorized current candidate, or an explicit empty selection.
   *
   * @access protected
   * @since unreleased
   *
   * @param {unknown} value - Native choice value validated against the current options.
   *
   * @returns {void} Result owned by the request workflow.
   */
  protected pick(value: unknown): void {
    if (this.disabled() || !this.canRead() || typeof value !== 'string') return;
    if (!value) {
      this.value.set('');
      return;
    }
    const candidate = this.store.equipmentEntities().find((entry) => entry.id === value);
    if (candidate && this.selectable(candidate)) this.value.set(value);
  }
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
