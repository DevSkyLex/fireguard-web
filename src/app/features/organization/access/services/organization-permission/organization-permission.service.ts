import { computed, inject, Injectable, type Signal } from '@angular/core';
import { catchError, finalize, map, Observable, of, shareReplay } from 'rxjs';
import { OrganizationMemberService } from '@features/organization/data-access';
import type {
  CurrentOrganizationMemberProfileOutput,
  OrganizationPermissionName,
} from '@features/organization/models';
import { OrganizationMemberAccessStore } from '@features/organization/state';
import type { StoreError } from '@core/state/request-state';

/**
 * Service OrganizationPermissionService
 * @class OrganizationPermissionService
 *
 * @description
 * Feature-owned helper service exposing ergonomic checks for the authenticated
 * user's effective permissions in the current active organization.
 *
 * Because this helper is owned and consumed inside the organization feature,
 * it reads the concrete `OrganizationMemberAccessStore` directly.
 *
 * The published `ORGANIZATION_MEMBER_ACCESS_PORT` remains the boundary for
 * external consumers such as sibling features, layouts, or shared UI.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Injectable({ providedIn: 'root' })
export class OrganizationPermissionService {
  //#region Properties
  /**
   * Property organizationMemberAccessStore
   * @readonly
   *
   * @description
   * Organization-owned store exposing the authenticated user's effective
   * access state in the currently active organization.
   *
   * @access private
   * @type {OrganizationMemberAccessStore}
   */
  private readonly organizationMemberAccessStore: OrganizationMemberAccessStore =
    inject<OrganizationMemberAccessStore>(OrganizationMemberAccessStore);

  /**
   * Property organizationMemberService
   * @readonly
   *
   * @description
   * API service used when permission checks need to be evaluated for a target
   * organization whose access payload is not already loaded in the current store.
   *
   * @access private
   * @type {OrganizationMemberService}
   */
  private readonly organizationMemberService: OrganizationMemberService =
    inject<OrganizationMemberService>(OrganizationMemberService);

  /**
   * Property permissions
   * @readonly
   *
   * @description
   * Effective permission names currently granted to the authenticated user in
   * the active organization.
   *
   * @access public
   * @type {Signal<ReadonlyArray<string>>}
   */
  public readonly permissions: Signal<ReadonlyArray<string>> =
    this.organizationMemberAccessStore.permissions;

  /**
   * Property isLoadingPermissions
   * @readonly
   *
   * @description
   * Indicates whether the organization-scoped permission payload is currently
   * loading.
   *
   * @access public
   * @type {Signal<boolean>}
   */
  public readonly isLoadingPermissions: Signal<boolean> =
    this.organizationMemberAccessStore.isLoadingAccess;

  /**
   * Property permissionError
   * @readonly
   *
   * @description
    * Last organization-scoped permission loading error exposed by the
    * organization access store.
   *
   * @access public
   * @type {Signal<StoreError | null>}
   */
  public readonly permissionError: Signal<StoreError | null> =
    this.organizationMemberAccessStore.accessError;

  /**
   * Property permissionSet
   * @readonly
   *
   * @description
   * Internal computed set of effective permission names used to keep permission
   * checks constant-time while remaining fully reactive to signal updates.
   *
   * @access private
   * @type {Signal<ReadonlySet<string>>}
   */
  private readonly permissionSet: Signal<ReadonlySet<string>> = computed(
    (): ReadonlySet<string> => new Set(this.permissions()),
  );

  /**
   * Property pendingProfiles
   * @readonly
   *
   * @description
   * Shared in-flight profile requests keyed by organization identifier.
   * Prevents multiple guards from issuing duplicate `/me` calls during the
   * same navigation.
   *
   * @access private
   * @type {Map<string, Observable<CurrentOrganizationMemberProfileOutput>>}
   */
  private readonly pendingProfiles: Map<string, Observable<CurrentOrganizationMemberProfileOutput>> =
    new Map<string, Observable<CurrentOrganizationMemberProfileOutput>>();
  //#endregion

  //#region Methods
  /**
   * Method reload
   * @method reload
   *
   * @description
   * Forces the organization feature to reload the authenticated user's access
   * payload for the currently active organization.
   *
   * @access public
   * @returns {void}
   */
  public reload(): void {
    this.organizationMemberAccessStore.reload();
  }

  /**
   * Method hasPermission
   * @method hasPermission
   *
   * @description
   * Returns whether the authenticated user currently has the requested
   * organization-scoped permission.
   *
   * Blank and whitespace-only permission names are rejected.
   *
   * @access public
   * @param {string} permission - Permission name to check.
   * @returns {boolean} `true` when the permission is currently granted.
   */
  public hasPermission(permission: OrganizationPermissionName): boolean {
    const normalizedPermission: string | null = this.normalizePermission(permission);
    return normalizedPermission !== null && this.permissionSet().has(normalizedPermission);
  }

  /**
   * Method hasAnyPermission
   * @method hasAnyPermission
   *
   * @description
   * Returns whether at least one permission from the provided list is currently
   * granted in the active organization.
   *
   * @access public
   * @param {ReadonlyArray<string>} permissions - Permission names to evaluate.
   * @returns {boolean} `true` when any permission is currently granted.
   */
  public hasAnyPermission(permissions: ReadonlyArray<OrganizationPermissionName>): boolean {
    return permissions.some((permission: OrganizationPermissionName) => this.hasPermission(permission));
  }

  /**
   * Method hasAllPermissions
   * @method hasAllPermissions
   *
   * @description
   * Returns whether every permission from the provided list is currently
   * granted in the active organization.
   *
   * @access public
   * @param {ReadonlyArray<string>} permissions - Permission names to evaluate.
   * @returns {boolean} `true` when all permissions are currently granted.
   */
  public hasAllPermissions(permissions: ReadonlyArray<OrganizationPermissionName>): boolean {
    return permissions.every((permission: OrganizationPermissionName) => this.hasPermission(permission));
  }

  /**
   * Method canAccessOrganization
   * @method canAccessOrganization
   *
   * @description
   * Evaluates whether the authenticated user can access organization-scoped
   * navigation requiring the provided permissions.
   *
  * When the requested organization already matches the loaded access store and
  * the access payload is in a successful state, the check is resolved from the
  * current store synchronously. Otherwise the current member profile is loaded
  * directly from the API through a shared in-flight request cache so that
  * concurrent guards reuse the same `/me` call.
   *
   * @access public
   * @param {string} organizationId - Target organization identifier.
   * @param {ReadonlyArray<string>} permissions - Required permission names.
   * @param {'all' | 'any'} [match='all'] - Matching strategy.
   * @returns {Observable<boolean>} `true` when route access should be granted.
   */
  public canAccessOrganization(
    organizationId: string,
    permissions: ReadonlyArray<OrganizationPermissionName>,
    match: 'all' | 'any' = 'all',
  ): Observable<boolean> {
    const normalizedPermissions: ReadonlyArray<string> = this.normalizePermissions(permissions);

    if (normalizedPermissions.length === 0) {
      return of(true);
    }

    if (
      this.organizationMemberAccessStore.currentOrganizationId() === organizationId &&
      this.organizationMemberAccessStore.accessCallState().status === 'success'
    ) {
      return of(this.matchesPermissions(this.permissions(), normalizedPermissions, match));
    }

    return this.getCurrentProfileOnce(organizationId).pipe(
      map((profile: CurrentOrganizationMemberProfileOutput) =>
        this.matchesPermissions(this.extractPermissionNames(profile), normalizedPermissions, match),
      ),
      catchError(() => of(false)),
    );
  }

  /**
   * Method normalizePermission
   * @method normalizePermission
   *
   * @description
   * Trims a permission name and rejects empty values so that the public check
   * methods can remain strict and predictable.
   *
   * @access private
   * @param {string} permission - Raw permission value to normalize.
   * @returns {string | null} The trimmed permission or `null` when empty.
   */
  private normalizePermission(permission: string): string | null {
    const normalizedPermission: string = permission.trim();
    return normalizedPermission.length > 0 ? normalizedPermission : null;
  }

  /**
   * Method normalizePermissions
   * @method normalizePermissions
   *
   * @description
   * Trims permission names and removes blank values from a permission list.
   *
   * @access private
   * @param {ReadonlyArray<string>} permissions - Raw permission names.
   * @returns {ReadonlyArray<string>} Normalized non-empty permission names.
   */
  private normalizePermissions(
    permissions: ReadonlyArray<OrganizationPermissionName>,
  ): ReadonlyArray<string> {
    return permissions
      .map((permission: string) => this.normalizePermission(permission))
      .filter((permission: string | null): permission is string => permission !== null);
  }

  /**
   * Method getCurrentProfileOnce
   * @method getCurrentProfileOnce
   *
   * @description
   * Returns a shared in-flight request for the target organization's current
   * member profile, creating it only once while the request is pending.
   *
   * @access private
   * @param {string} organizationId - Target organization identifier.
   * @returns {Observable<CurrentOrganizationMemberProfileOutput>} Shared profile request.
   */
  private getCurrentProfileOnce(
    organizationId: string,
  ): Observable<CurrentOrganizationMemberProfileOutput> {
    const existingRequest:
      | Observable<CurrentOrganizationMemberProfileOutput>
      | undefined = this.pendingProfiles.get(organizationId);

    if (existingRequest) {
      return existingRequest;
    }

    const request$: Observable<CurrentOrganizationMemberProfileOutput> = this.organizationMemberService
      .getCurrentProfile(organizationId)
      .pipe(
        finalize(() => {
          this.pendingProfiles.delete(organizationId);
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );

    this.pendingProfiles.set(organizationId, request$);
    return request$;
  }

  /**
   * Method matchesPermissions
   * @method matchesPermissions
   *
   * @description
   * Evaluates a granted permission set against a required permission list using
   * the provided matching strategy.
   *
   * @access private
   * @param {ReadonlyArray<string>} grantedPermissions - Granted permission names.
   * @param {ReadonlyArray<string>} requiredPermissions - Required permission names.
   * @param {'all' | 'any'} match - Matching strategy.
   * @returns {boolean} `true` when the requirement is satisfied.
   */
  private matchesPermissions(
    grantedPermissions: ReadonlyArray<string>,
    requiredPermissions: ReadonlyArray<string>,
    match: 'all' | 'any',
  ): boolean {
    const grantedPermissionSet: ReadonlySet<string> = new Set(grantedPermissions);

    return match === 'any'
      ? requiredPermissions.some((permission: string) => grantedPermissionSet.has(permission))
      : requiredPermissions.every((permission: string) => grantedPermissionSet.has(permission));
  }

  /**
   * Method extractPermissionNames
   * @method extractPermissionNames
   *
   * @description
   * Extracts the effective permission names from a current organization member
   * profile payload.
   *
   * @access private
   * @param {CurrentOrganizationMemberProfileOutput} profile - Current member profile.
   * @returns {ReadonlyArray<string>} Effective permission names.
   */
  private extractPermissionNames(
    profile: CurrentOrganizationMemberProfileOutput,
  ): ReadonlyArray<string> {
    return profile.permissions.map((permission) => permission.name);
  }
  //#endregion
}
