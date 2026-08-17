import { inject, Service } from '@angular/core';
import { CookieService } from '@core/cookie';
import type { InspectionListSort } from '@features/organization/features/inspections/models';
import {
  buildListSortCookieOptions,
  decodeListSortCookie,
  resolvePersistedListSort,
} from '@shared/list-sort-preferences';

/**
 * Cookie holding the inspections list's remembered ordering.
 */
const PREFERENCES_COOKIE_NAME = 'fg-inspection-list';

/**
 * Ordering used when nothing has been remembered: most recently performed
 * inspection first, the question the list is opened to answer.
 */
const DEFAULT_SORT: InspectionListSort = { field: 'performedAt', direction: 'desc' };

/**
 * Shape persisted in the cookie. Deliberately not exported: it is an encoding
 * detail, and every caller goes through {@link InspectionListPreferencesService.readSort}
 * and {@link InspectionListPreferencesService.writeSort}.
 */
interface PersistedPreferences {
  readonly sortField?: string;
  readonly sortDirection?: string;
}

/**
 * Narrows a decoded sort field to one this build's inspections list supports.
 */
function isInspectionSortField(field: string): field is InspectionListSort['field'] {
  return (
    field === 'result' || field === 'status' || field === 'performedAt' || field === 'createdAt'
  );
}

/**
 * Service InspectionListPreferencesService
 * @class InspectionListPreferencesService
 *
 * @description
 * Remembers how an operator left the inspections list ordered — the only
 * presentation preference this list has, unlike `interventions`' equivalent
 * service, which also remembers hidden columns and page size. Filters and
 * search are deliberately not remembered — they are questions asked now, not
 * stored preferences.
 *
 * A behavioral service rather than a util (`ARCHITECTURE.md` §10.7): it needs
 * `CookieService`, and a util may not inject. `CookieService` already no-ops
 * on the server, so {@link readSort} is safe during SSR. The persisted-shape
 * codec (decode/validate/serialize) is shared with the other feature-local
 * list-sort preference services through `@shared/list-sort-preferences`; only
 * the cookie name, field whitelist, and default stay local here.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Service()
export class InspectionListPreferencesService {
  //#region Properties
  /**
   * Property cookies
   * @readonly
   * @description Transport for the persisted preference.
   * @access private
   * @since 1.0.0
   * @type {CookieService}
   */
  private readonly cookies: CookieService = inject<CookieService>(CookieService);
  //#endregion

  //#region Methods
  /**
   * Method readSort
   *
   * @description
   * The remembered ordering, or most-recently-performed-first when none was
   * stored or the stored one no longer names a field this build supports.
   *
   * @access public
   * @since 1.0.0
   *
   * @returns {InspectionListSort} The restored ordering.
   */
  public readSort(): InspectionListSort {
    const stored: PersistedPreferences = this.read();

    return resolvePersistedListSort(
      stored.sortField,
      stored.sortDirection,
      isInspectionSortField,
      DEFAULT_SORT,
    );
  }

  /**
   * Method writeSort
   * @description Persists the current ordering.
   * @access public
   * @since 1.0.0
   * @param {InspectionListSort} sort - The ordering to remember.
   * @returns {void}
   */
  public writeSort(sort: InspectionListSort): void {
    this.cookies.setCookie<string>(
      buildListSortCookieOptions(
        PREFERENCES_COOKIE_NAME,
        JSON.stringify({
          sortField: sort.field,
          sortDirection: sort.direction,
        } satisfies PersistedPreferences),
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
