import { DatePipe, formatDate } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  LOCALE_ID,
  output,
  type InputSignal,
  type OutputEmitterRef,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCircleAlert, lucideCircleDotDashed, lucideClipboardCheck } from '@ng-icons/lucide';
import type { InspectionOutput } from '@features/organization/features/inspections/models';
import { resolveInterventionTag } from '@features/organization/features/interventions/models';
import { EmptyState } from '@shared/empty-state';
import { ErrorState } from '@shared/error-state';
import { HlmAvatarImports } from '@shared/ui/avatar';
import { HlmBadge } from '@shared/ui/badge';
import { HlmButton } from '@shared/ui/button';
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
 * through the backend's canonical `intervention` search filter, with a
 * "Show more" button appending further pages. No search, no row actions. A
 * row's performed date links to the inspection's own record, unless it is
 * still an intervention-scoped draft — those do not resolve on the
 * canonical route yet, so they render as plain text with an outline "Draft"
 * badge beside it (icon + label, never colour-only). The link's accessible
 * name folds in the result label since a bare date repeats across rows.
 *
 * @version 1.4.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-inspections-table',
  imports: [
    DatePipe,
    NgIcon,
    RouterLink,
    EmptyState,
    ErrorState,
    HlmBadge,
    HlmButton,
    HlmSkeleton,
    InterventionTag,
    ...HlmAvatarImports,
    ...HlmTableImports,
  ],
  providers: [provideIcons({ lucideCircleAlert, lucideCircleDotDashed, lucideClipboardCheck })],
  templateUrl: './intervention-inspections-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionInspectionsTable {
  //#region Inputs
  /**
   * Property organizationId
   * @readonly
   * @description The workspace owning the intervention, so a row can link into its inspection's own record.
   * @access public
   * @since 1.3.0
   * @type {InputSignal<string>}
   */
  public readonly organizationId: InputSignal<string> = input.required<string>();

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

  /**
   * Property totalItems
   * @readonly
   * @description Total linked inspections the server reports, across all pages.
   * @access public
   * @since 1.2.0
   * @type {InputSignal<number>}
   */
  public readonly totalItems: InputSignal<number> = input<number>(0);

  /**
   * Property loadingMore
   * @readonly
   * @description Whether the next page of linked inspections is being fetched.
   * @access public
   * @since 1.2.0
   * @type {InputSignal<boolean>}
   */
  public readonly loadingMore: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Outputs
  /**
   * Property loadMoreRequested
   * @readonly
   * @description Emits when the user asks for the next page of linked inspections.
   * @access public
   * @since 1.2.0
   * @type {OutputEmitterRef<void>}
   */
  public readonly loadMoreRequested: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Properties
  /** Placeholder rows for the loading render. */
  protected readonly skeletonRows: ReadonlyArray<number> = SKELETON_ROWS;

  /** The active locale, for formatting the link accessible name's date. */
  private readonly locale: string = inject(LOCALE_ID);
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

  /**
   * Method isDraftRecord
   *
   * @description
   * Whether the row is an intervention-scoped draft, which does not resolve
   * on the canonical `/inspections/:id` route — such a row renders as plain
   * text instead of a broken link.
   *
   * @access protected
   * @since 1.3.0
   *
   * @param {InspectionOutput} item - The inspection being rendered.
   *
   * @returns {boolean} `true` while the record is still a draft.
   */
  protected isDraftRecord(item: InspectionOutput): boolean {
    return item.recordStatus === 'draft';
  }

  /**
   * Method linkAriaLabelOf
   *
   * @description
   * The row's link accessible name: the visible text is a bare date, which
   * repeats across same-day rows and says nothing standalone in a
   * screen-reader link list — so the name folds in "Inspection" and the
   * result label alongside the localized date.
   *
   * @access protected
   * @since 1.4.0
   *
   * @param {InspectionOutput} item - The inspection being rendered.
   *
   * @returns {string} The accessible name.
   */
  protected linkAriaLabelOf(item: InspectionOutput): string {
    const performed: string = formatDate(item.performedAt, 'mediumDate', this.locale);
    const result: string = resolveInterventionTag('inspectionResult', item.result).label;

    return $localize`:@@intervention.linked.inspections.linkAriaLabel:Inspection performed ${performed}:performed:, ${result}:result:`;
  }
  //#endregion
}
