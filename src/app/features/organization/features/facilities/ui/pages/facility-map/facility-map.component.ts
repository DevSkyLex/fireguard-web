import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  PLATFORM_ID,
  untracked,
  type Signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { CardModule } from 'primeng/card';
import { MessageModule } from 'primeng/message';
import { SkeletonModule } from 'primeng/skeleton';
import { FacilityMapStore } from '@features/organization/features/facilities/state';
import { FacilityMapCanvas } from '@features/organization/features/facilities/ui/components';
import { ActiveOrganizationStore } from '@features/organization/state';
import { EmptyState } from '@shared/components';

/**
 * Component FacilityMapPage
 * @class FacilityMapPage
 *
 * @description
 * Route page plotting the organization's facilities on a map. It loads every
 * facility browser-side (no SSR/`TransferState`, since the map is browser-only),
 * defers the heavy MapLibre canvas until it scrolls into view, and lists any
 * facilities missing coordinates so they stay reachable. Orchestration only —
 * the {@link FacilityMapStore} owns loading and the canvas owns rendering.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-facility-map',
  imports: [RouterLink, CardModule, MessageModule, SkeletonModule, EmptyState, FacilityMapCanvas],
  providers: [FacilityMapStore],
  templateUrl: './facility-map.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacilityMapPage {
  //#region Properties
  /**
   * Property store
   * @readonly
   *
   * @description
   * Component-scoped store loading and partitioning the organization facilities.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FacilityMapStore}
   */
  protected readonly store = inject(FacilityMapStore);

  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Active organization id, or empty string before it resolves.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly organizationId: Signal<string> = computed<string>(
    () => this.activeOrganization.selectedOrganization()?.id ?? '',
  );

  private readonly activeOrganization: ActiveOrganizationStore =
    inject<ActiveOrganizationStore>(ActiveOrganizationStore);
  private readonly platformId: object = inject(PLATFORM_ID);
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Loads facilities browser-side once the organization id is known.
   *
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    effect((): void => {
      if (!isPlatformBrowser(this.platformId)) return;
      const organizationId: string = this.organizationId();
      if (!organizationId) return;
      // Trigger the load outside reactive tracking: the store's rxMethod reads
      // and writes its own call-state synchronously, which would otherwise make
      // this effect depend on the very signal it mutates and loop indefinitely.
      untracked((): void => {
        this.store.load(organizationId);
      });
    });
  }
  //#endregion
}
