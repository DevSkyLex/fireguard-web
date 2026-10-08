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
  untracked,
  type InputSignal,
  type ModelSignal,
  type Signal,
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';
import {
  InventoryPickerStore,
  type InventoryPickerStoreType,
} from '@features/organization/features/inventory/state/inventory-picker';
import { HlmAlertImports } from '@shared/ui/alert';
import { HlmButton } from '@shared/ui/button';
import { HlmComboboxImports } from '@shared/ui/combobox';
import { HlmSpinner } from '@shared/ui/spinner';

/**
 * Class InventoryWarehousePicker
 * @class InventoryWarehousePicker
 *
 * @description
 * Browser-only warehouse choice widget hydrates historical selections separately.
 */
@Component({
  selector: 'app-inventory-warehouse-picker',
  templateUrl: './inventory-warehouse-picker.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HlmButton, HlmSpinner, ...HlmComboboxImports, ...HlmAlertImports],
  providers: [InventoryPickerStore],
})
export class InventoryWarehousePicker implements FormValueControl<string> {
  //#region Properties
  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Organization authority for server choices and selected record hydration.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string>}
   */
  public readonly organizationId: InputSignal<string> = input('');

  /**
   * Property value
   * @readonly
   *
   * @description
   * Stable reference UUID exposed to Signal Forms.
   *
   * @access public
   * @since unreleased
   *
   * @type {ModelSignal<string>}
   */
  public readonly value: ModelSignal<string> = model('');

  /**
   * Property inputId
   * @readonly
   *
   * @description
   * Native label association supplied by the host form.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string>}
   */
  public readonly inputId: InputSignal<string> = input('inventory-warehouse-picker');

  /**
   * Property disabled
   * @readonly
   *
   * @description
   * Locks selection without discarding its UUID.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly disabled: InputSignal<boolean> = input(false);

  /**
   * Property store
   * @readonly
   *
   * @description
   * Candidate pages and independently hydrated selection.
   *
   * @access protected
   * @since unreleased
   *
   * @type {InventoryPickerStoreType}
   */
  protected readonly store: InventoryPickerStoreType = inject(InventoryPickerStore);

  /**
   * Property platformId
   * @readonly
   *
   * @description
   * Secondary authenticated reads never run during SSR.
   *
   * @access private
   * @since unreleased
   *
   * @type {object}
   */
  private readonly platformId: object = inject(PLATFORM_ID);

  /**
   * Property placeholder
   * @readonly
   *
   * @description
   * Accessible selection prompt.
   *
   * @access protected
   * @since unreleased
   *
   * @type {string}
   */
  protected readonly placeholder: string = $localize`:@@inventory.picker.warehouse.placeholder:Choose a warehouse`;

  /**
   * Property selectedLabel
   * @readonly
   *
   * @description
   * Displays an archived retained reference without offering it as a new choice.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<string>}
   */
  protected readonly selectedLabel: Signal<string> = computed(() => {
    const item = this.store.readCallState().data;
    if (item?.id !== this.value()) return this.value();
    return (
      ('label' in item ? item.label : item.name) +
      (item.archived ? $localize`:@@inventory.picker.archived: (archived)` : '')
    );
  });

  /**
   * Property labelOf
   * @readonly
   *
   * @description
   * Label callback preserves the selection across search pages.
   *
   * @access protected
   * @since unreleased
   *
   * @type {(value: unknown) => string}
   */
  protected readonly labelOf: (value: unknown) => string = (value) => {
    if (typeof value !== 'string' || !value) return this.placeholder;
    if (value === this.value()) return this.selectedLabel();
    const item = this.store.referenceEntities().find((candidate) => candidate.id === value);
    return item ? ('label' in item ? item.label : item.name) : value;
  };

  /**
   * Property remoteFilter
   * @readonly
   *
   * @description
   * Server search, rather than page-local filtering, owns matching.
   *
   * @access protected
   * @since unreleased
   *
   * @type {() => boolean}
   */
  protected readonly remoteFilter: () => boolean = () => true;
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Cancels obsolete organization reads and hydrates a selected UUID independently.
   *
   * @access public
   * @since unreleased
   */
  public constructor() {
    effect(() => {
      const organizationId = this.organizationId();
      const id = this.value();
      untracked(() => {
        if (!isPlatformBrowser(this.platformId)) return;
        if (this.store.query()?.organizationId !== organizationId) {
          this.store.load(null);
          if (organizationId) this.store.load({ organizationId, kind: 'warehouse' });
        }
        this.store.read(organizationId && id ? { organizationId, kind: 'warehouse', id } : null);
      });
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method search
   * @method search
   *
   * @description
   * Starts a new server search on page one.
   *
   * @access protected
   * @since unreleased
   *
   * @param {string} search - Authorized directory search term.
   *
   * @returns {void} No return value.
   */
  protected search(search: string): void {
    if (!this.disabled() && isPlatformBrowser(this.platformId) && this.organizationId())
      this.store.load({
        organizationId: this.organizationId(),
        kind: 'warehouse',
        search,
        page: 1,
      });
  }

  /**
   * Method page
   * @method page
   *
   * @description
   * Pages within the current server search.
   *
   * @access protected
   * @since unreleased
   *
   * @param {number} page - Server page starting at one.
   *
   * @returns {void} No return value.
   */
  protected page(page: number): void {
    const query = this.store.query();
    if (!this.disabled() && query) this.store.load({ ...query, page });
  }

  /**
   * Method retrySelection
   * @method retrySelection
   *
   * @description
   * Retries only the retained item read, preserving the candidate page.
   *
   * @access protected
   * @since unreleased
   *
   * @returns {void} No return value.
   */
  protected retrySelection(): void {
    if (this.organizationId() && this.value() && isPlatformBrowser(this.platformId))
      this.store.read({
        organizationId: this.organizationId(),
        kind: 'warehouse',
        id: this.value(),
      });
  }

  /**
   * Method pick
   * @method pick
   *
   * @description
   * Refuses archived, unreturned and non-string new selections.
   *
   * @access protected
   * @since unreleased
   *
   * @param {unknown} value - Candidate stable reference UUID.
   *
   * @returns {void} No return value.
   */
  protected pick(value: unknown): void {
    if (this.disabled() || typeof value !== 'string') return;
    if (
      !value ||
      this.store.referenceEntities().some((item) => item.id === value && !item.archived)
    )
      this.value.set(value);
  }
  //#endregion
}
