import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  OnInit,
  type InputSignal,
  type Signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { provideIcons } from '@ng-icons/core';
import { lucideLock } from '@ng-icons/lucide';
import { OrganizationPermissionService } from '@features/organization/access';
import { ORGANIZATION_PERMISSION, type MemberDirectoryEntry } from '@features/organization/models';
import {
  MEMBER_DIRECTORY_PORT,
  ORGANIZATION_CONTEXT_PORT,
  type MemberDirectoryPort,
  type OrganizationContextPort,
} from '@features/organization/ports';
import { EmptyState } from '@shared/empty-state';
import { IdentitySummary } from '@shared/identity-summary';
import { HlmBadge } from '@shared/ui/badge';
import { HlmSkeleton } from '@shared/ui/skeleton';

/**
 * Component OrganizationMemberProfilePage
 * @class OrganizationMemberProfilePage
 *
 * @description
 * Someone else's profile, in the same contextual column and the same shape as
 * your own — minus everything that is nobody else's business, and minus every
 * control that would change something.
 *
 * What it can show is decided by the API, not by taste: there is **no endpoint
 * for a single user**. The only route to another person is the organization's
 * member list, which `MEMBER_DIRECTORY_PORT` indexes, and which yields a name,
 * a picture, roles and whether the membership is active. No address, no dates,
 * no security state — none of it reaches the client in the first place.
 *
 * The port publishes `isAvailable` because reading the directory needs
 * `organization.members.read`; without it the store never calls, so this says
 * so rather than showing an error the reader cannot act on.
 *
 * A "Interventions they are responsible for" link, gated on
 * `organization.interventions.read`, points at the interventions list
 * pre-filtered by `?responsible=`, which the list page already parses.
 *
 * @version 1.1.0
 *
 * @example
 * ```typescript
 * { path: ':memberId', component: OrganizationMemberProfilePage }
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-member-profile-page',
  imports: [RouterLink, EmptyState, IdentitySummary, HlmBadge, HlmSkeleton],
  providers: [provideIcons({ lucideLock })],
  templateUrl: './organization-member-profile-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationMemberProfilePage implements OnInit {
  //#region Inputs
  /**
   * Property memberId
   * @readonly
   *
   * @description
   * Whose profile to show, bound from the route parameter.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly memberId: InputSignal<string> = input.required<string>();
  //#endregion

  //#region Properties
  /**
   * Property directory
   * @readonly
   *
   * @description
   * The organization's members, indexed by id.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {MemberDirectoryPort}
   */
  protected readonly directory: MemberDirectoryPort =
    inject<MemberDirectoryPort>(MEMBER_DIRECTORY_PORT);

  /**
   * Property organizationContext
   * @readonly
   *
   * @description
   * Which organization's directory to load.
   *
   * The column renders beside the page rather than instead of it, so the
   * primary outlet still carries `:organizationId` and this still answers —
   * which is the whole reason a panel route can be organization-scoped without
   * naming an organization itself.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {OrganizationContextPort}
   */
  private readonly organizationContext: OrganizationContextPort =
    inject<OrganizationContextPort>(ORGANIZATION_CONTEXT_PORT);

  /** Gates the "Interventions they are responsible for" link on `organization.interventions.read`. */
  private readonly permissions: OrganizationPermissionService = inject(
    OrganizationPermissionService,
  );

  /**
   * Property organizationId
   * @readonly
   * @description The organization currently open, for the responsibility link's route.
   * @access protected
   * @since 1.1.0
   * @type {Signal<string | null>}
   */
  protected readonly organizationId: Signal<string | null> = computed((): string | null =>
    this.organizationContext.selectedOrganizationId(),
  );

  /**
   * Property canReadInterventions
   * @readonly
   * @description Whether the viewer may see the "Interventions they are responsible for" link.
   * @access protected
   * @since 1.1.0
   * @type {Signal<boolean>}
   */
  protected readonly canReadInterventions: Signal<boolean> = computed((): boolean =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.INTERVENTIONS_READ),
  );

  /**
   * Property member
   * @readonly
   *
   * @description
   * The member being shown, or `null` while the directory is loading or when it
   * holds nobody by that id.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<MemberDirectoryEntry | null>}
   */
  protected readonly member: Signal<MemberDirectoryEntry | null> = computed(
    (): MemberDirectoryEntry | null => this.directory.byId().get(this.memberId()) ?? null,
  );

  /**
   * Property isMissing
   * @readonly
   *
   * @description
   * Whether the directory has loaded and simply does not hold this member —
   * distinct from still loading, and from not being allowed to look.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly isMissing: Signal<boolean> = computed(
    (): boolean =>
      this.directory.isAvailable() && !this.directory.isLoading() && this.member() === null,
  );

  /**
   * Property roles
   * @readonly
   *
   * @description
   * The roles this member holds in the organization, which is the one thing
   * about them that is genuinely public here.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly string[]>}
   */
  protected readonly roles: Signal<readonly string[]> = computed(
    (): readonly string[] => this.member()?.roleNames ?? [],
  );
  //#endregion

  //#region Lifecycle
  /**
   * Method ngOnInit
   * @method ngOnInit
   *
   * @description
   * Asks for the directory of the organization currently open. The store skips
   * the call when it already holds that organization, and never calls at all
   * without `organization.members.read` — the request would be a guaranteed
   * 403.
   *
   * @access public
   * @since 1.0.0
   *
   * @returns {void}
   */
  public ngOnInit(): void {
    const organizationId: string | null = this.organizationContext.selectedOrganizationId();

    if (organizationId === null) return;

    this.directory.ensureLoaded(organizationId);
  }
  //#endregion
}
