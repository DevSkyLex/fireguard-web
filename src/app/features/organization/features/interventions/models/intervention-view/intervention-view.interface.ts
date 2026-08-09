import type { InterventionListFilters } from './intervention-list-filters.interface';
import type { InterventionListSort } from './intervention-list-sort.interface';

/**
 * Type InterventionRender
 *
 * @description
 * How a work view draws its interventions. Each render groups by what it is:
 * the list by the view's {@link InterventionGrouping}, the board by workflow
 * status (its drag-and-drop *is* a status transition), the calendar by date.
 *
 * Mirrored in the `?view=` query param, kept under that name so installed
 * applications and bookmarks still resolve.
 *
 * @since 1.0.0
 */
export type InterventionRender = 'list' | 'board' | 'calendar';

/**
 * Type InterventionGrouping
 *
 * @description
 * How the list render sections its rows. A property of the view rather than a
 * separate control: "what am I looking at" and "how is it stacked" are one
 * decision, and the operator should not have to make it twice a day.
 *
 * @since 1.0.0
 */
export type InterventionGrouping = 'status' | 'dueWindow' | 'site' | 'responsible';

/**
 * Interface InterventionView
 * @interface InterventionView
 *
 * @description
 * A named question about the intervention collection, carrying everything that
 * makes it that question: the narrowing, the ordering, the sectioning, and the
 * render it opens in.
 *
 * The list used to be a catalogue an operator re-filtered every morning. A view
 * is that morning's work, saved.
 *
 * Views are serialized into a cookie, so every field must survive
 * `JSON.stringify` — no dates, no functions, no signals.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface InterventionView {
  //#region Properties
  /** Stable identifier, also the cookie key for the selected view. */
  readonly id: string;

  /** Name shown on the view bar, localized for built-ins, typed for the rest. */
  readonly label: string;

  /** Whether the view ships with the product and cannot be deleted. */
  readonly builtin: boolean;

  /**
   * The narrowing. A built-in may use the `@me` sentinel in `responsible`,
   * resolved to the current member at query time so the stored view does not
   * hard-code whoever happened to open it.
   */
  readonly filters: InterventionListFilters;

  /** The ordering. */
  readonly sort: InterventionListSort;

  /** How the list render sections its rows. */
  readonly grouping: InterventionGrouping;

  /** The render this view opens in. */
  readonly render: InterventionRender;
  //#endregion
}
