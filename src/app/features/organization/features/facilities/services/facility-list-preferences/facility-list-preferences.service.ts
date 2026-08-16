import { inject, Service } from '@angular/core';
import { CookieService } from '@core/cookie';
import type {
  FacilityListSort,
  FacilitySortField,
} from '@features/organization/features/facilities/models';

/**
 * Cookie holding the facilities list's remembered shape.
 */
const PREFERENCES_COOKIE_NAME = 'fg-facility-list';

/**
 * One year. A working preference should outlive a session; nothing here is
 * sensitive — a sort field and a direction.
 */
const PREFERENCES_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

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
 * on the server, so every method here is safe during SSR.
 *
 * Every read is defensive: a cookie is user-editable and survives
 * deployments, so a malformed or retired field falls back to the default
 * instead of propagating into the query.
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
    const field: string | undefined = stored.sortField;

    if (
      field !== 'name' &&
      field !== 'type' &&
      field !== 'status' &&
      field !== 'createdAt' &&
      field !== 'updatedAt' &&
      field !== 'code'
    )
      return DEFAULT_SORT;

    return {
      field: field satisfies FacilitySortField,
      direction: stored.sortDirection === 'desc' ? 'desc' : 'asc',
    };
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
    this.cookies.setCookie<string>({
      name: PREFERENCES_COOKIE_NAME,
      value: JSON.stringify({ sortField: sort.field, sortDirection: sort.direction }),
      path: '/',
      maxAge: PREFERENCES_COOKIE_MAX_AGE,
      sameSite: 'Lax',
    });
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
    if (!raw) return {};

    try {
      const parsed: unknown = JSON.parse(raw);

      return typeof parsed === 'object' && parsed !== null ? (parsed as PersistedPreferences) : {};
    } catch {
      return {};
    }
  }
  //#endregion
}
