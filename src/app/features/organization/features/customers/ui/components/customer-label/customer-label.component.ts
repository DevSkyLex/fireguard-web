import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  effect,
  inject,
  input,
  untracked,
  type InputSignal,
} from '@angular/core';
import {
  CustomerStore,
  type CustomerStoreType,
} from '@features/organization/features/customers/state';
import { HlmButton } from '@shared/ui/button';
import { HlmSkeleton } from '@shared/ui/skeleton';

/**
 * Class CustomerLabel
 * @class CustomerLabel
 *
 * @description
 * Reads an existing customer link without fetching an unrelated directory.
 *
 * @since unreleased
 */
@Component({
  selector: 'app-customer-label',
  templateUrl: './customer-label.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HlmButton, HlmSkeleton],
  providers: [CustomerStore],
})
export class CustomerLabel {
  //#region Properties
  /**
   * Property customerId
   * @readonly
   *
   * @description
   * Existing customer id or an unassigned site.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string | null>}
   */
  public readonly customerId: InputSignal<string | null> = input<string | null>(null);
  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Organization authority.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string>}
   */
  public readonly organizationId: InputSignal<string> = input.required<string>();
  /**
   * Property store
   * @readonly
   *
   * @description
   * Selected-record lifecycle.
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
   * No authenticated secondary read on the server.
   *
   * @access private
   * @since unreleased
   *
   * @type {object}
   */
  private readonly platformId: object = inject(PLATFORM_ID);
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Cancels obsolete retained-link reads.
   *
   * @access public
   * @since unreleased
   */
  public constructor() {
    effect(() => {
      const organizationId = this.organizationId();
      const customerId = this.customerId();
      untracked(() => {
        if (isPlatformBrowser(this.platformId))
          this.store.read(customerId ? { organizationId, customerId } : null);
      });
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method retry
   * @method
   *
   * @description
   * Retries a failed retained-label read.
   *
   * @access protected
   * @since unreleased
   *
   * @returns {void} No return value.
   */
  protected retry(): void {
    const customerId = this.customerId();
    if (customerId) this.store.read({ organizationId: this.organizationId(), customerId });
  }
  //#endregion
}
