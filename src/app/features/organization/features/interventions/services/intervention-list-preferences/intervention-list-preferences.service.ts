import { inject, Injectable } from '@angular/core';
import { CookieService } from '@core/cookie';
import { MAX_CUSTOM_VIEWS } from '@features/organization/features/interventions/constants';
import type {
  InterventionListSort,
  InterventionSortField,
  InterventionView,
} from '@features/organization/features/interventions/models';

/**
 * Cookie holding the interventions list's remembered shape.
 */
const PREFERENCES_COOKIE_NAME = 'fg-intervention-list';

/**
 * One year. A working preference should outlive a session; nothing here is
 * sensitive — a sort field and a set of folded sections.
 */
const PREFERENCES_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * Ordering used when nothing has been remembered: soonest deadline first, which
 * is the question the list is opened to answer.
 */
const DEFAULT_SORT: InterventionListSort = { field: 'dueAt', direction: 'asc' };

/**
 * Sections folded away on a first visit: the two terminal statuses.
 */
const DEFAULT_COLLAPSED_GROUPS: readonly string[] = ['published', 'abandoned'];

/**
 * Cookies cap out around 4 KB. Nothing here should approach that, but a
 * corrupted or hand-edited value must not be written back unbounded.
 */
const MAX_COLLAPSED_GROUPS = 24;

/**
 * Shape persisted in the cookie. Deliberately not exported: it is an encoding
 * detail, and every caller goes through the accessors below.
 */
interface PersistedPreferences {
  readonly showAbandoned?: boolean;
  readonly collapsedGroups?: readonly string[];
  readonly sortField?: string;
  readonly sortDirection?: string;
  readonly viewId?: string;
  readonly customViews?: readonly InterventionView[];
}

/**
 * Function isUsableView
 *
 * @description
 * Whether a decoded cookie entry carries enough to be used as a view. Only the
 * fields the page reads without a fallback are required; anything else is
 * allowed to be missing and defaulted downstream.
 *
 * @param {unknown} value - Candidate entry.
 *
 * @returns {boolean} Whether the entry can be trusted.
 *
 * @since 1.1.0
 */
function isUsableView(value: unknown): value is InterventionView {
  if (typeof value !== 'object' || value === null) return false;

  const candidate = value as Partial<InterventionView>;

  return (
    typeof candidate.id === 'string' &&
    candidate.id.length > 0 &&
    typeof candidate.label === 'string' &&
    candidate.label.length > 0 &&
    typeof candidate.filters === 'object' &&
    candidate.filters !== null
  );
}

/**
 * Service InterventionListPreferencesService
 * @class InterventionListPreferencesService
 *
 * @description
 * Remembers how an operator left the interventions list: which sections were
 * folded, whether abandoned work was showing, and how the collection was
 * ordered.
 *
 * A behavioral service rather than a util (ARCHITECTURE.md §10.7): it needs
 * `CookieService`, and a util may not inject. Cookies are the only persistence
 * this application uses — there is no `localStorage` anywhere — and
 * `CookieService` already no-ops on the server, so every method here is safe
 * during SSR.
 *
 * Every read is defensive. A cookie is user-editable and survives deployments,
 * so a malformed or outdated value falls back to the default instead of
 * propagating into the query.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Injectable({ providedIn: 'root' })
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
   * Method readShowAbandoned
   *
   * @description
   * Whether abandoned interventions were left visible. Off by default: they are
   * terminal, and most sessions never need them.
   *
   * @access public
   * @since 1.0.0
   *
   * @returns {boolean} The restored preference.
   */
  public readShowAbandoned(): boolean {
    return this.read().showAbandoned === true;
  }

  /**
   * Method readCollapsedGroups
   *
   * @description
   * Ids of the sections left folded.
   *
   * @access public
   * @since 1.0.0
   *
   * @returns {ReadonlySet<string>} The restored fold state.
   */
  public readCollapsedGroups(): ReadonlySet<string> {
    const stored: readonly string[] | undefined = this.read().collapsedGroups;

    if (!Array.isArray(stored)) return new Set<string>(DEFAULT_COLLAPSED_GROUPS);

    return new Set<string>(
      stored.filter((id): id is string => typeof id === 'string').slice(0, MAX_COLLAPSED_GROUPS),
    );
  }

  /**
   * Method readSort
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
    const field: string | undefined = stored.sortField;

    if (field !== 'dueAt' && field !== 'createdAt' && field !== 'priority') return DEFAULT_SORT;

    return {
      field: field satisfies InterventionSortField,
      direction: stored.sortDirection === 'desc' ? 'desc' : 'asc',
    };
  }

  /**
   * Method write
   *
   * @description
   * Persists the whole remembered shape in one cookie. Callers pass the current
   * state rather than mutating field by field, so the cookie is never written
   * half-updated.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {boolean} showAbandoned - Whether abandoned work is visible.
   * @param {ReadonlySet<string>} collapsedGroups - Ids of the folded sections.
   * @param {InterventionListSort} sort - Active ordering.
   * @returns {void}
   */
  public write(
    showAbandoned: boolean,
    collapsedGroups: ReadonlySet<string>,
    sort: InterventionListSort,
  ): void {
    const stored: PersistedPreferences = this.read();

    this.persist({
      ...stored,
      showAbandoned,
      collapsedGroups: [...collapsedGroups].slice(0, MAX_COLLAPSED_GROUPS),
      sortField: sort.field,
      sortDirection: sort.direction,
    });
  }

  /**
   * Method readViewId
   *
   * @description
   * Identifier of the view the operator left open, or null when none was
   * stored. The caller decides what an unknown id means — a view may have been
   * deleted since.
   *
   * @access public
   * @since 1.1.0
   *
   * @returns {string | null} The remembered view id.
   */
  public readViewId(): string | null {
    const stored: string | undefined = this.read().viewId;

    return typeof stored === 'string' && stored ? stored : null;
  }

  /**
   * Method writeViewId
   *
   * @description
   * Remembers the open view, so the next session starts on the same question.
   *
   * @access public
   * @since 1.1.0
   *
   * @param {string} viewId - Identifier of the selected view.
   * @returns {void}
   */
  public writeViewId(viewId: string): void {
    this.persist({ ...this.read(), viewId });
  }

  /**
   * Method readCustomViews
   *
   * @description
   * The views this operator saved. Every entry is validated: a cookie is
   * user-editable and survives deployments, so a malformed view is dropped
   * rather than propagated into a query.
   *
   * @access public
   * @since 1.1.0
   *
   * @returns {readonly InterventionView[]} The restored views, capped.
   */
  public readCustomViews(): readonly InterventionView[] {
    const stored: readonly InterventionView[] | undefined = this.read().customViews;
    if (!Array.isArray(stored)) return [];

    return stored.filter((view) => isUsableView(view)).slice(0, MAX_CUSTOM_VIEWS);
  }

  /**
   * Method writeCustomViews
   *
   * @description
   * Replaces the saved views. The cap is enforced here as well as at the call
   * site: the cookie is the thing that must never grow unbounded.
   *
   * @access public
   * @since 1.1.0
   *
   * @param {readonly InterventionView[]} views - Views to persist.
   * @returns {void}
   */
  public writeCustomViews(views: readonly InterventionView[]): void {
    this.persist({ ...this.read(), customViews: views.slice(0, MAX_CUSTOM_VIEWS) });
  }

  /**
   * Method persist
   *
   * @description
   * Writes the whole record in one cookie, so it is never left half-updated.
   *
   * @access private
   * @since 1.1.0
   *
   * @param {PersistedPreferences} payload - Full record to store.
   * @returns {void}
   */
  private persist(payload: PersistedPreferences): void {
    this.cookies.setCookie<string>({
      name: PREFERENCES_COOKIE_NAME,
      value: JSON.stringify(payload),
      path: '/',
      maxAge: PREFERENCES_COOKIE_MAX_AGE,
      sameSite: 'Lax',
    });
  }

  /**
   * Method read
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
