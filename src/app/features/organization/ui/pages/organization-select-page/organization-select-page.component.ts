import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  type WritableSignal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { OrganizationStore } from '@features/organization/state';
import { HlmAlertImports } from '@shared/ui/alert';
import { HlmButton } from '@shared/ui/button';
import { HlmItemImports } from '@shared/ui/item';
import { HlmSpinner } from '@shared/ui/spinner';

/**
 * Component OrganizationSelectPage
 * @class OrganizationSelectPage
 * @description Lets the account choose among current server-authorized memberships. Browser-only
 * loading keeps this secondary collection out of SSR and hydration payloads.
 * @since 1.0.0
 */
@Component({
  selector: 'app-organization-select-page',
  imports: [RouterLink, HlmButton, HlmItemImports, HlmAlertImports, HlmSpinner],
  providers: [OrganizationStore],
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
    this.store.loadOrganizations({ page, itemsPerPage: 30 });
  }
}
