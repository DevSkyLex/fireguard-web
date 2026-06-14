import { ChangeDetectionStrategy, Component, effect, inject, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import type { MissionOutput } from '@features/organization/features/missions/models';
import { MissionStore } from '@features/organization/features/missions/state';
import { MissionTable } from '@features/organization/features/missions/ui/tables';
import { ActiveOrganizationStore } from '@features/organization/state';

/**
 * Component MissionListPage
 * @class MissionListPage
 *
 * @description
 * Route entry page for mission listing and mission creation.
 *
 * The page reacts to the active organization context, loads available
 * missions, and navigates into the mission workflow when creation succeeds.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-mission-list-page',
  imports: [ButtonModule, MissionTable],
  providers: [MissionStore],
  templateUrl: './mission-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MissionListPage {
  //#region Properties
  /**
   * Property organization
   * @readonly
   *
   * @description
   * Store exposing the active organization context.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {ActiveOrganizationStore}
   */
  private readonly organization: ActiveOrganizationStore = inject(ActiveOrganizationStore);

  /**
   * Property router
   * @readonly
   *
   * @description
   * Angular Router used to navigate to mission detail pages.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Router}
   */
  private readonly router: Router = inject(Router);

  /**
   * Property store
   * @readonly
   *
   * @description
   * Component-scoped mission store powering the list and creation flows.
   *
   * @access protected
   * @since 1.0.0
   */
  protected readonly store = inject(MissionStore);
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Initializes the class dependencies and reactive behavior.
   *
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    effect(() => {
      const organizationId = this.organizationId();
      if (organizationId) {
        this.store.load({ organizationId });
      }
    });

    effect(() => {
      const mission = this.store.createdMission();
      const organizationId = this.organizationId();

      if (!mission || !organizationId) {
        return;
      }

      untracked(() => this.store.clearCreatedMission());
      void this.router.navigate(['/organizations', organizationId, 'missions', mission.id]);
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method onCreate
   * @method onCreate
   *
   * @description
   * Creates a mission with the given name under the active organization.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} name - Mission name submitted by the table form.
   *
   * @return {void}
   */
  protected onCreate(name: string): void {
    const organizationId = this.organizationId();
    if (organizationId) {
      this.store.create({ organizationId, name });
    }
  }

  /**
   * Method createGuidedMission
   * @method createGuidedMission
   *
   * @description
   * Executes the create guided mission operation.
   *
   * @access protected
   * @since 1.0.0
   *
   * @return {void} Result of the create guided mission operation.
   */
  protected createGuidedMission(): void {
    const organizationId = this.organizationId();
    if (organizationId) {
      void this.router.navigate(['/organizations', organizationId, 'missions', 'new']);
    }
  }

  /**
   * Method onRefresh
   * @method onRefresh
   *
   * @description
   * Reloads the mission list for the active organization.
   *
   * @access protected
   * @since 1.0.0
   *
   * @return {void}
   */
  protected onRefresh(): void {
    const organizationId = this.organizationId();
    if (organizationId) {
      this.store.load({ organizationId });
    }
  }

  /**
   * Method onView
   * @method onView
   *
   * @description
   * Navigates to the detail page of the selected mission.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {MissionOutput} mission - Mission selected in the table.
   *
   * @return {void}
   */
  protected onView(mission: MissionOutput): void {
    const organizationId = this.organizationId();
    if (organizationId) {
      void this.router.navigate(['/organizations', organizationId, 'missions', mission.id]);
    }
  }

  /**
   * Method organizationId
   * @method organizationId
   *
   * @description
   * Returns the active organization identifier, if any.
   *
   * @access private
   * @since 1.0.0
   *
   * @return {string | undefined} Active organization identifier, if any.
   */
  private organizationId(): string | undefined {
    return this.organization.selectedOrganization()?.id;
  }
  //#endregion
}
