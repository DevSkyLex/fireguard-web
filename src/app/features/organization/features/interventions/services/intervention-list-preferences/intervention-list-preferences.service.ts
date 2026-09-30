import { inject, Service } from '@angular/core';
import { CookieService } from '@core/cookie';
import type {
  InterventionListSort,
  InterventionSortField,
} from '@features/organization/features/interventions/models';
import {
  buildListSortCookieOptions,
  decodeListSortCookie,
  resolvePersistedListSort,
} from '@shared/list-sort-preferences';

/**
 * Constant PREFERENCES_COOKIE_NAME
 *
 * @description
 * Cookie holding the interventions list's remembered shape.
 */
const PREFERENCES_COOKIE_NAME = 'fg-intervention-list';

/**
 * Constant DEFAULT_SORT
 *
 * @description
 * is the question the list is opened to answer.
 */
const DEFAULT_SORT: InterventionListSort = { field: 'dueAt', direction: 'asc' };

/**
 * Constant MAX_HIDDEN_COLUMNS
 *
 * @description
 * corrupted or hand-edited value must not be written back unbounded.
 */
const MAX_HIDDEN_COLUMNS = 24;

/**
 * Interface PersistedPreferences
 * @interface
 *
 * @description
 * detail, and every caller goes through the accessors below.
 */
interface PersistedPreferences {
  /**
   * Property sortField
   * @readonly
   *
   * @description
   * Names the field used to order the equipment list.
   *
   * @access public
   *
   * @type {string}
   */
  readonly sortField?: string;

  /**
   * Property sortDirection
   * @readonly
   *
   * @description
   * Selects ascending or descending order for the equipment list.
   *
   * @access public
   *
   * @type {string}
   */
  readonly sortDirection?: string;

  /**
   * Property hiddenColumns
   * @readonly
   *
   * @description
   * Lists table columns hidden by the saved preference.
   *
   * @access public
   *
   * @type {readonly string[]}
   */
  readonly hiddenColumns?: readonly string[];

  /**
   * Property pageSize
   * @readonly
   *
   * @description
   * Sets the maximum number of persisted preferences records requested on each page.
   *
   * @access public
   *
   * @type {number}
   */
  readonly pageSize?: number;
}

/**
 * Function isInterventionSortField
 *
 * @description
 * Checks whether a persisted sort-field value is supported by the interventions list.
 *
 * @access public
 * @since unreleased
 *
 * @param {string} field - Candidate sort-field value read from persisted preferences.
 *
 * @returns {field is InterventionSortField} Whether the field is a supported intervention sort key.
 */
function isInterventionSortField(field: string): field is InterventionSortField {
  return (
    field === 'name' ||
    field === 'dueAt' ||
    field === 'plannedStartAt' ||
    field === 'createdAt' ||
    field === 'updatedAt' ||
    field === 'priority'
  );
}

/**
 * Class InterventionListPreferencesService
 * @class InterventionListPreferencesService
 *
 * @description
 * Remembers how an operator left the interventions list: how the collection
 * was ordered, which optional columns were hidden, and how many rows a page
 * held. Filters are deliberately not remembered — they are questions asked
 * now, not stored preferences.
 * A behavioral service rather than a util (ARCHITECTURE.md §10.7): it needs
 * `CookieService`, and a util may not inject. Cookies are the only persistence
 * this application uses — there is no `localStorage` anywhere — and
 * `CookieService` already no-ops on the server, so every method here is safe
 * during SSR. The persisted-shape codec's decode/validate step for the sort
 * field reuses `@shared/list-sort-preferences` unchanged — the hidden-column
 * and page-size handling below has no equivalent in the other list-sort
 * preference services and stays local.
 * Every read is defensive. A cookie is user-editable and survives deployments,
 * so a malformed or outdated value falls back to the default instead of
 * propagating into the query; column ids and page sizes are returned raw and
 * narrowed by the page against what this build actually offers.
 *
 * @version 2.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Service()
export class InterventionListPreferencesService {
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
   * @method readSort
   *
   * @description
   * The remembered ordering, or soonest-deadline-first when none was stored or
   * the stored one no longer names a field this build supports.
   *
   * @access public
   * @since 1.0.0
   *
   * @returns {InterventionListSort} The restored ordering.
   */
  public readSort(): InterventionListSort {
    const stored: PersistedPreferences = this.read();

    return resolvePersistedListSort(
      stored.sortField,
      stored.sortDirection,
      isInterventionSortField,
      DEFAULT_SORT,
    );
  }

  /**
   * Method readHiddenColumns
   * @method readHiddenColumns
   *
   * @description
   * Ids of the optional columns the operator hid, as stored. The page narrows
   * them against the columns this build actually offers, so a column retired
   * since the cookie was written is simply ignored.
   *
   * @access public
   * @since 2.0.0
   *
   * @returns {ReadonlySet<string>} The restored hidden-column ids.
   */
  public readHiddenColumns(): ReadonlySet<string> {
    const stored: readonly string[] | undefined = this.read().hiddenColumns;
    if (!Array.isArray(stored)) return new Set<string>();

    return new Set<string>(
      stored.filter((id): id is string => typeof id === 'string').slice(0, MAX_HIDDEN_COLUMNS),
    );
  }

  /**
   * Method readPageSize
   * @method readPageSize
   *
   * @description
   * The remembered rows-per-page, or `null` when none was stored or the value
   * is not a usable positive integer. The page narrows it against the sizes it
   * offers.
   *
   * @access public
   * @since 2.0.0
   *
   * @returns {number | null} The restored page size.
   */
  public readPageSize(): number | null {
    const stored: number | undefined = this.read().pageSize;

    return typeof stored === 'number' && Number.isInteger(stored) && stored > 0 ? stored : null;
  }

  /**
   * Method write
   * @method write
   *
   * @description
   * Persists the whole remembered shape in one cookie. Callers pass the current
   * state rather than mutating field by field, so the cookie is never written
   * half-updated.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {InterventionListSort} sort - Active ordering.
   * @param {ReadonlySet<string>} hiddenColumns - Ids of the hidden columns.
   * @param {number} pageSize - Rows per page.
   *
   * @returns {void}
   */
  public write(
    sort: InterventionListSort,
    hiddenColumns: ReadonlySet<string>,
    pageSize: number,
  ): void {
    this.persist({
      sortField: sort.field,
      sortDirection: sort.direction,
      hiddenColumns: [...hiddenColumns].slice(0, MAX_HIDDEN_COLUMNS),
      pageSize,
    });
  }

  /**
   * Method persist
   * @method persist
   *
   * @description
   * Writes the whole record in one cookie, so it is never left half-updated.
   *
   * @access private
   * @since 1.1.0
   *
   * @param {PersistedPreferences} payload - Full record to store.
   *
   * @returns {void}
   */
  private persist(payload: PersistedPreferences): void {
    this.cookies.setCookie<string>(
      buildListSortCookieOptions(PREFERENCES_COOKIE_NAME, JSON.stringify(payload)),
    );
  }

  /**
   * Method read
   * @method read
   *
   * @description
   * Decodes the cookie, answering with an empty record for anything that is not
   * a JSON object — absent, truncated, or hand-edited.
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
