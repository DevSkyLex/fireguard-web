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
import type { FormValueControl as FormValueControlType } from '@angular/forms/signals';
import {
  CustomerStore,
  type CustomerStoreType,
} from '@features/organization/features/customers/state';
import { HlmButton } from '@shared/ui/button';
import { HlmComboboxImports } from '@shared/ui/combobox';

/**
 * Class CustomerPicker
 * @class CustomerPicker
 *
 * @description
 * Browser-only customer choice widget keeps selected archived records readable.
 *
 * @since unreleased
 */
@Component({
  selector: 'app-customer-picker',
  templateUrl: './customer-picker.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HlmButton, ...HlmComboboxImports],
  providers: [CustomerStore],
})
export class CustomerPicker implements FormValueControlType<string> {
  //#region Properties
  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Organization authority for directory and retained-selection reads.
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
   * Signal Forms value; empty string means no customer.
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
   * Native label association.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string>}
   */
  public readonly inputId: InputSignal<string> = input('customer-picker');
  /**
   * Property disabled
   * @readonly
   *
   * @description
   * Disables selection without erasing its current value.
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
   * Scoped directory and retained item request states.
   *
   * @access protected
   * @since unreleased
   *
   * @type {CustomerStoreType}
   */
  protected readonly store: CustomerStoreType = inject(CustomerStore);
  /**
   * Property platformId
   * @readonly
   *
   * @description
   * Browser demand-only loading avoids SSR side effects.
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
   * Accessible choice placeholder.
   *
   * @access protected
   * @since unreleased
   *
   * @type {string}
   */
  protected readonly placeholder: string = $localize`:@@customer.picker.placeholder:Choose a customer`;
  /**
   * Property selectedLabel
   * @readonly
   *
   * @description
   * Retained selected record, even when absent from the active search page.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<string>}
   */
  protected readonly selectedLabel: Signal<string> = computed(() => {
    const selected = this.store.readCallState().data;
    if (selected?.id !== this.value()) return this.value();
    const archivedSuffix = selected.archivedAt
      ? $localize`:@@customer.picker.archived: (archived)`
      : '';
    return selected.name + archivedSuffix;
  });
  /**
   * Property labelOf
   * @readonly
   *
   * @description
   * Label callback uses selected-record hydration before directory fallback.
   *
   * @access protected
   * @since unreleased
   *
   * @type {(value: unknown) => string}
   */
  protected readonly labelOf: (value: unknown) => string = (value) => {
    if (typeof value !== 'string' || !value) return $localize`:@@customer.picker.none:No customer`;
    if (value === this.value()) return this.selectedLabel();
    return this.store.customerEntities().find((customer) => customer.id === value)?.name ?? value;
  };
  /**
   * Property remoteFilter
   * @readonly
   *
   * @description
   * Server search owns filtering; local filtering could hide later-page matches.
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
   * Hydrates existing links separately and cancels obsolete organization reads.
   *
   * @access public
   * @since unreleased
   */
  public constructor() {
    effect(() => {
      const organizationId = this.organizationId();
      const value = this.value();
      untracked(() => {
        if (!isPlatformBrowser(this.platformId)) return;
        if (this.store.query()?.organizationId !== organizationId) {
          this.store.load(null);
          if (organizationId) this.store.load({ organizationId });
        }
        this.store.read(organizationId && value ? { organizationId, customerId: value } : null);
      });
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method search
   * @method
   *
   * @description
   * Searches every server page instead of truncating the authorized directory.
   *
   * @access protected
   * @since unreleased
   *
   * @param {string} search - Server search term across the authorized customer directory.
   *
   * @returns {void} No return value.
   */
  protected search(search: string): void {
    if (isPlatformBrowser(this.platformId) && this.organizationId())
      this.store.load({ organizationId: this.organizationId(), search, page: 1 });
  }
  /**
   * Method page
   * @method
   *
   * @description
   * Loads the selected candidate page without losing its search.
   *
   * @access protected
   * @since unreleased
   *
   * @param {number} page - Requested server page, starting at one.
   *
   * @returns {void} No return value.
   */
  protected page(page: number): void {
    const query = this.store.query();
    if (query) this.store.load({ ...query, page });
  }
  /**
   * Method pick
   * @method
   *
   * @description
   * Accepts only active returned candidates or an explicit empty selection.
   *
   * @access protected
   * @since unreleased
   *
   * @param {unknown} value - Value supplied by the owning customer workflow.
   *
   * @returns {void} No return value.
   */
  protected pick(value: unknown): void {
    if (this.disabled() || typeof value !== 'string') return;
    if (
      !value ||
      this.store
        .customerEntities()
        .some((customer) => customer.id === value && !customer.archivedAt)
    )
      this.value.set(value);
  }
  //#endregion
}
