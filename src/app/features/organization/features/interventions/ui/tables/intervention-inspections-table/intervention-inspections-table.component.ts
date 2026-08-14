import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, type InputSignal } from '@angular/core';
import { provideIcons } from '@ng-icons/core';
import { lucideClipboardCheck, lucideCircleAlert } from '@ng-icons/lucide';
import type { InspectionOutput } from '@features/organization/features/inspections/models';
import { EmptyState } from '@shared/empty-state';
import { HlmAvatarImports } from '@shared/ui/avatar';
import { HlmSkeleton } from '@shared/ui/skeleton';
import { HlmTableImports } from '@shared/ui/table';
import { InterventionTag } from '../../components/intervention-tag';

/** Placeholder rows drawn while the tab's own fetch is in flight. */
const SKELETON_ROWS: ReadonlyArray<number> = [1, 2, 3];

/**
 * Component InterventionInspectionsTable
 * @class InterventionInspectionsTable
 *
 * @description
 * The Inspections tab of the intervention detail page's "Linked" surface: a
 * read-only `hlmTable` of the inspections scoped to this intervention
 * through the backend's canonical `intervention` search filter. No
 * pagination, no search, no row actions.
 *
 * @version 1.1.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-inspections-table',
  imports: [
    DatePipe,
    EmptyState,
    HlmSkeleton,
    InterventionTag,
    ...HlmAvatarImports,
    ...HlmTableImports,
  ],
  providers: [provideIcons({ lucideCircleAlert, lucideClipboardCheck })],
  templateUrl: './intervention-inspections-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionInspectionsTable {
  //#region Inputs
  /**
   * Property items
   * @readonly
   * @description The inspections linked to this intervention.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly InspectionOutput[]>}
   */
  public readonly items: InputSignal<readonly InspectionOutput[]> =
    input.required<readonly InspectionOutput[]>();

  /**
   * Property loading
   * @readonly
   * @description Whether the tab's own fetch is in flight.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly loading: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property error
   * @readonly
   * @description The tab's own fetch error, or `null`.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string | null>}
   */
  public readonly error: InputSignal<string | null> = input<string | null>(null);
  //#endregion

  //#region Properties
  /** Placeholder rows for the loading render. */
  protected readonly skeletonRows: ReadonlyArray<number> = SKELETON_ROWS;
  //#endregion

  //#region Methods
  /**
   * Method inspectorInitialsOf
   * @description Avatar fallback initials derived from the inspector's display name.
   * @access protected
   * @since 1.0.0
   * @param {InspectionOutput} item - The inspection being rendered.
   * @returns {string} Up to two uppercase initials, or an empty string when there is no inspector.
   */
  protected inspectorInitialsOf(item: InspectionOutput): string {
    const name: string | undefined = item.inspector?.displayName;
    if (!name) return '';

    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part: string): string => part.charAt(0).toUpperCase())
      .join('');
  }
  //#endregion
}
