import { ChangeDetectionStrategy, Component, inject, type OnInit } from '@angular/core';
import { UserStore } from '@features/account/state';
import type { OrganizationMembershipRole, OrganizationOutput } from '@features/organization/models';
import { OrganizationStore } from '@features/organization/state';
import { Tag, type TagDescriptor } from '@shared/components';

/**
 * Component AccountAccessPanel
 * @class AccountAccessPanel
 *
 * @description
 * The account's platform-wide access: the global roles carried by the signed-in
 * user, the permissions those roles resolve to, and the user's organization
 * memberships (per organization: owner flag and assigned org-role labels, as
 * carried by `GET /api/organizations`).
 *
 * `/api/me` has always returned both — `UserProfileOutput.roles` and
 * `.permissions` — and `UserStore` has always exposed them. Nothing rendered
 * them, so a user had no way to see what they are allowed to do.
 *
 * Memberships reuse the organization feature's published list slice
 * (`OrganizationStore`, the same data path as the shell's rail switcher),
 * provided at component level so the list loads only when this tab mounts.
 *
 * Read-only by design: global roles are granted by an administrator, never
 * edited from one's own account.
 *
 * @version 1.1.0
 *
 * @example
 * ```html
 * <app-account-access-panel />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-account-access-panel',
  imports: [Tag],
  providers: [OrganizationStore],
  templateUrl: './account-access-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountAccessPanel implements OnInit {
  //#region Properties
  /**
   * Property userStore
   * @readonly
   *
   * @description
   * Authenticated-user store, read directly for `roles` and `permissions`.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {UserStore}
   */
  protected readonly userStore: UserStore = inject<UserStore>(UserStore);

  /**
   * Property organizationStore
   * @readonly
   *
   * @description
   * Component-scoped organization list store backing the memberships section.
   * Consumed through `@features/organization/state`, the feature's published
   * state barrel (cross-feature dependency documented in both FEATURE.md).
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {OrganizationStore}
   */
  protected readonly organizationStore: OrganizationStore =
    inject<OrganizationStore>(OrganizationStore);
  //#endregion

  //#region Lifecycle
  /**
   * Loads the caller's organization list unless it is already cached or in
   * flight. The panel mounts only when the Access tab is active, so the
   * fetch is naturally lazy.
   *
   * @since 1.1.0
   */
  public ngOnInit(): void {
    if (
      this.organizationStore.organizations().length ||
      this.organizationStore.isLoadingOrganizations()
    ) {
      return;
    }

    this.organizationStore.loadOrganizations();
  }
  //#endregion

  //#region Methods
  /**
   * Method roleTag
   * @method roleTag
   *
   * @description
   * Presentation descriptor for one of the caller's assigned organization
   * roles. Labels are dynamic (org-defined role names), so no registry
   * applies — the descriptor is built inline.
   *
   * @access protected
   * @since 1.1.0
   *
   * @param {OrganizationMembershipRole} role - Assigned organization role.
   *
   * @returns {TagDescriptor} Descriptor for the shared Tag component.
   */
  protected roleTag(role: OrganizationMembershipRole): TagDescriptor {
    return { label: role.label, severity: 'secondary', icon: 'pi pi-id-card' };
  }

  /**
   * Method initialOf
   * @method initialOf
   *
   * @description
   * First grapheme of the organization name, upper-cased, for logo-less
   * tiles — same convention as the shell's organization rail switcher.
   *
   * @access protected
   * @since 1.1.0
   *
   * @param {OrganizationOutput} organization - Organization to label.
   *
   * @returns {string} Tile initial.
   */
  protected initialOf(organization: OrganizationOutput): string {
    return organization.name.trim().charAt(0).toUpperCase() || '?';
  }
  //#endregion
}
