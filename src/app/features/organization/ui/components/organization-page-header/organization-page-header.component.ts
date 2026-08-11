import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { InputSignal, Signal } from '@angular/core';
import { getOrganizationInitials } from '@features/organization/utils';
import { HlmAvatar, HlmAvatarFallback, HlmAvatarImage } from '@shared/ui/avatar';
import { HlmBadge } from '@shared/ui/badge';
import { HlmSkeleton } from '@shared/ui/skeleton';
import type { OrganizationPageHeaderOrganization } from './models';

/**
 * Component OrganizationPageHeader
 * @class OrganizationPageHeader
 *
 * @description
 * The shared masthead for an organization's rich pages (statistics, Today,
 * billing overview): the organization's own identity — avatar, name, plan and
 * (when it is not the desirable `active` one) status — sitting above the
 * page's own title, subtitle and member count, with a projected slot for the
 * page's actions on the right.
 *
 * `organization` is `null` while the caller has not resolved it yet, which
 * renders an avatar and name-line skeleton in place of the identity row —
 * the same convention `OrganizationSwitcher` uses, so a page reached directly
 * never flashes empty badges before the resource arrives.
 *
 * Purely presentational: it takes the organization and title as inputs and
 * injects nothing, so any page composing it stays the one place that reads a
 * store (`ARCHITECTURE.md` §10.3).
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-organization-page-header
 *   [organization]="organizationContext.selectedOrganization()"
 *   title="Statistics"
 *   subtitle="Trends across the last 30 days"
 * >
 *   <button hlmBtn variant="outline">Export</button>
 * </app-organization-page-header>
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-page-header',
  imports: [HlmAvatar, HlmAvatarFallback, HlmAvatarImage, HlmBadge, HlmSkeleton],
  templateUrl: './organization-page-header.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationPageHeader {
  //#region Inputs
  /**
   * Property organization
   * @readonly
   *
   * @description
   * The organization the header identifies, or `null` while it is still
   * resolving.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<OrganizationPageHeaderOrganization | null>}
   */
  public readonly organization: InputSignal<OrganizationPageHeaderOrganization | null> =
    input<OrganizationPageHeaderOrganization | null>(null);

  /**
   * Property title
   * @readonly
   *
   * @description
   * The page's own heading, already localized by the caller.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly title: InputSignal<string> = input.required<string>();

  /**
   * Property subtitle
   * @readonly
   *
   * @description
   * Optional sentence under the title.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string | null>}
   */
  public readonly subtitle: InputSignal<string | null> = input<string | null>(null);
  //#endregion

  //#region Properties
  /**
   * Property initials
   * @readonly
   *
   * @description
   * The avatar's fallback initials, empty until the organization resolves.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly initials: Signal<string> = computed<string>(() => {
    const organization = this.organization();

    return organization ? getOrganizationInitials(organization.name) : '';
  });

  /**
   * Property statusLabel
   * @readonly
   *
   * @description
   * The raw status, shown as a badge only when the organization is resolved
   * and its status is not the desirable `active` one — an active organization
   * needs no callout.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string | null>}
   */
  protected readonly statusLabel: Signal<string | null> = computed<string | null>(() => {
    const status = this.organization()?.status;

    if (!status || status === 'active') return null;

    return status.replace(/_/g, ' ');
  });

  /**
   * Property memberCountLabel
   * @readonly
   *
   * @description
   * The muted "N member(s)" line, `null` when the organization has not
   * resolved or carries no member count.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string | null>}
   */
  protected readonly memberCountLabel: Signal<string | null> = computed<string | null>(() => {
    const count = this.organization()?.memberCount;

    if (count === null || count === undefined) return null;
    if (count === 1) return $localize`:@@org.pageHeader.memberCountOne:1 member`;

    return $localize`:@@org.pageHeader.memberCountMany:${count}:count: members`;
  });
  //#endregion
}
