import { ChangeDetectionStrategy, Component, computed, inject, OnInit, type Signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DataViewModule } from 'primeng/dataview';
import { SkeletonModule } from 'primeng/skeleton';
import { OrganizationStore } from '@core/stores/organization';
import type { OrganizationOutput } from '@core/models/organization';

/**
 * Component OrganizationListPage
 * @class OrganizationListPage
 *
 * @description
 * Page that displays all organizations the authenticated user
 * belongs to. Each card links to the organization's dashboard.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-list',
  imports: [RouterModule, AvatarModule, ButtonModule, CardModule, DataViewModule, SkeletonModule],
  templateUrl: './organization-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationListPage implements OnInit {
  //#region Properties
  /**
   * Property organizationStore
   * @readonly
   *
   * @description
   * Organization store providing the list of organizations
   * and loading state.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {OrganizationStore}
   */
  protected readonly organizationStore: OrganizationStore =
    inject<OrganizationStore>(OrganizationStore);

  /**
   * Property organizationsList
   * @readonly
   *
   * @description
   * Mutable copy of organizations for DataView binding.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<OrganizationOutput[]>}
   */
  protected readonly organizationsList: Signal<OrganizationOutput[]> =
    computed<OrganizationOutput[]>(() => this.organizationStore.organizations() as OrganizationOutput[]);
  //#endregion

  //#region Lifecycle
  /**
   * Method ngOnInit
   * @method ngOnInit
   *
   * @description
   * Loads the organizations list on initialization if not already loaded.
   *
   * @access public
   * @since 1.0.0
   *
   * @returns {void}
   */
  public ngOnInit(): void {
    if (!this.organizationStore.organizations().length) {
      this.organizationStore.loadOrganizations();
    }
  }
  //#endregion
}
