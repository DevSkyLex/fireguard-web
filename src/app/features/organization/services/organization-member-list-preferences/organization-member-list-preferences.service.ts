import { inject, Service } from '@angular/core';
import { CookieService } from '@core/cookie';
import type { OrganizationMemberListSort } from '@features/organization/models';
import {
  buildListSortCookieOptions,
  decodeListSortCookie,
  resolvePersistedListSort,
} from '@shared/list-sort-preferences';

/**
 * Cookie holding the members roster's remembered ordering.
 */
const PREFERENCES_COOKIE_NAME = 'fg-organization-member-list';

/**
 * Ordering used when nothing has been remembered — the API's own default.
 */
const DEFAULT_SORT: OrganizationMemberListSort = { field: 'joinedAt', direction: 'asc' };

/**
 * Shape persisted in the cookie. Deliberately not exported: it is an encoding
 * detail, and every caller goes through the accessors below.
 */
interface PersistedSort {
  readonly field?: string;
  readonly direction?: string;
}

/**
 * Narrows a decoded sort field to one this build's members roster supports.
 */
function isOrganizationMemberSortField(
  field: string,
): field is OrganizationMemberListSort['field'] {
  return field === 'joinedAt' || field === 'displayName';
}

/**
 * Service OrganizationMemberListPreferencesService
 * @class OrganizationMemberListPreferencesService
 *
 * @description
 * Remembers how the members roster was last ordered, mirroring
 * `InterventionListPreferencesService`'s cookie-backed approach at the scale
 * this table actually needs — one field, one direction; the roster has no
 * hideable columns or remembered page size to carry alongside it.
 *
 * A behavioral service rather than a util (`ARCHITECTURE.md` §10.7): it needs
 * `CookieService`, and a util may not inject. `CookieService` already no-ops
 * on the server, so every method here is safe during SSR. The persisted-shape
 * codec (decode/validate/serialize) is shared with the other feature-local
 * list-sort preference services through `@shared/list-sort-preferences`; only
 * the cookie name, field whitelist, and default stay local here.
 *
 * @since 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Service()
export class OrganizationMemberListPreferencesService {
  //#region Properties
  /** Transport for the persisted ordering. */
  private readonly cookies: CookieService = inject<CookieService>(CookieService);
  //#endregion

  //#region Methods
  /**
   * Method readSort
   *
   * @description
   * The remembered ordering, or {@link DEFAULT_SORT} when none was stored or
   * the stored one no longer names a field this build supports.
   *
   * @access public
   * @since 1.0.0
   *
   * @returns {OrganizationMemberListSort} The restored ordering.
   */
  public readSort(): OrganizationMemberListSort {
    const stored: PersistedSort = this.read();

    return resolvePersistedListSort(
      stored.field,
      stored.direction,
      isOrganizationMemberSortField,
      DEFAULT_SORT,
    );
  }

  /**
   * Method write
   *
   * @description
   * Persists the roster's current ordering.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {OrganizationMemberListSort} sort - The active ordering.
   * @returns {void}
   */
  public write(sort: OrganizationMemberListSort): void {
    this.cookies.setCookie<string>(
      buildListSortCookieOptions(
        PREFERENCES_COOKIE_NAME,
        JSON.stringify({
          field: sort.field,
          direction: sort.direction,
        } satisfies PersistedSort),
      ),
    );
  }

  /**
   * Method read
   *
   * @description
   * Decodes the cookie, answering with an empty record for anything that is
   * not a JSON object — absent, truncated, or hand-edited.
   *
   * @access private
   * @since 1.0.0
   *
   * @returns {PersistedSort} The decoded preferences.
   */
  private read(): PersistedSort {
    const raw: string | null = this.cookies.getCookie<string>(PREFERENCES_COOKIE_NAME);

    return decodeListSortCookie(raw) as PersistedSort;
  }
  //#endregion
}
