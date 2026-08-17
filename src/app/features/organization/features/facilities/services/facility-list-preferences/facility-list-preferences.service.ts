import { inject, Service } from '@angular/core';
import { CookieService } from '@core/cookie';
import type {
  FacilityListSort,
  FacilitySortField,
} from '@features/organization/features/facilities/models';
import {
  buildListSortCookieOptions,
  decodeListSortCookie,
  resolvePersistedListSort,
} from '@shared/list-sort-preferences';

/**
 * Cookie holding the facilities list's remembered shape.
 */
const PREFERENCES_COOKIE_NAME = 'fg-facility-list';

/**
 * Ordering used when nothing has been remembered — the backend's own default
 * (`ListFacilitiesProvider`).
 */
const DEFAULT_SORT: FacilityListSort = { field: 'name', direction: 'asc' };

/**
 * Shape persisted in the cookie. Deliberately not exported: it is an encoding
 * detail, and every caller goes through the accessors below.
 */
interface PersistedPreferences {
  readonly sortField?: string;
  readonly sortDirection?: string;
}

/**
 * Narrows a decoded sort field to one this build's facilities list supports.
 */
function isFacilitySortField(field: string): field is FacilitySortField {
  return (
    field === 'name' ||
    field === 'type' ||
    field === 'status' ||
    field === 'createdAt' ||
    field === 'updatedAt' ||
    field === 'code'
  );
}

/**
 * Service FacilityListPreferencesService
 * @class FacilityListPreferencesService
 *
 * @description
 * Remembers how an operator left the facilities list ordered, the same
 * shape `InterventionListPreferencesService` keeps for interventions —
 * narrowed to sort alone, since this list has neither hideable columns nor a
 * remembered page size.
 *
 * A behavioral service rather than a util (`ARCHITECTURE.md` §10.7): it needs
 * `CookieService`, and a util may not inject. `CookieService` already no-ops
 * on the server, so every method here is safe during SSR. The persisted-shape
 * codec (decode/validate/serialize) is shared with the other feature-local
 * list-sort preference services through `@shared/list-sort-preferences`; only
 * the cookie name, field whitelist, and default stay local here.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Service()
export class FacilityListPreferencesService {
  //#region Properties
  /**
   * Property cookies
   * @readonly
   *
   * @description
   * Transport for the persisted preferences.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {CookieService}
   */
  private readonly cookies: CookieService = inject<CookieService>(CookieService);
  //#endregion

  //#region Methods
  /**
   * Method readSort
   *
   * @description
   * The remembered ordering, or name/asc when none was stored or the stored
   * one no longer names a field this build supports.
   *
   * @access public
   * @since 1.0.0
   *
   * @returns {FacilityListSort} The restored ordering.
   */
  public readSort(): FacilityListSort {
    const stored: PersistedPreferences = this.read();

    return resolvePersistedListSort(
      stored.sortField,
      stored.sortDirection,
      isFacilitySortField,
      DEFAULT_SORT,
    );
  }

  /**
   * Method write
   *
   * @description
   * Persists the active ordering in one cookie.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {FacilityListSort} sort - Active ordering.
   *
   * @returns {void}
   */
  public write(sort: FacilityListSort): void {
    this.cookies.setCookie<string>(
      buildListSortCookieOptions(
        PREFERENCES_COOKIE_NAME,
        JSON.stringify({ sortField: sort.field, sortDirection: sort.direction }),
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
   * @returns {PersistedPreferences} The decoded preferences.
   */
  private read(): PersistedPreferences {
    const raw: string | null = this.cookies.getCookie<string>(PREFERENCES_COOKIE_NAME);

    return decodeListSortCookie(raw) as PersistedPreferences;
  }
  //#endregion
}
