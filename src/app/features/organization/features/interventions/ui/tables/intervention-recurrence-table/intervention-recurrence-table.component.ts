import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  LOCALE_ID,
  inject,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideCalendarClock,
  lucideCircleAlert,
  lucideEllipsis,
  lucidePause,
  lucidePencil,
  lucideTrash2,
} from '@ng-icons/lucide';
import type {
  InterventionRecurrenceFrequency,
  InterventionRecurrenceOutput,
  InterventionTemplateOutput,
} from '@features/organization/features/interventions/models';
import { interventionRecurrenceFrequencyLabel } from '@features/organization/features/interventions/utils';
import { CollectionSurface } from '@shared/collection-surface';
import {
  DEFAULT_REGIONAL_FORMAT_SETTINGS,
  OrgDatePipe,
  type RegionalFormatSettings,
} from '@shared/regional-format';
import { formatRelativeTime } from '@shared/relative-time';
import { ResourceIllustration } from '@shared/resource-illustration';
import { HlmButton } from '@shared/ui/button';
import { HlmDropdownMenuImports } from '@shared/ui/dropdown-menu';
import { HlmEmptyImports } from '@shared/ui/empty';
import { HlmItemImports } from '@shared/ui/item';
import { HlmSwitch } from '@shared/ui/switch';
import { HlmTableImports } from '@shared/ui/table';
import { HlmTooltipImports } from '@shared/ui/tooltip';

/**
 * Component InterventionRecurrenceTable
 * @class InterventionRecurrenceTable
 *
 * @description
 * The organization's recurring intervention schedules, as a full-width `hlmTable` grid: name,
 * template, cadence, next occurrence, an active toggle, and a row's ellipsis action menu. This
 * table only renders the list and reports row intents through {@link editRequested}, {@link removed}
 * and {@link activeToggled} — the owning page decides what a row's Delete action means, including
 * any confirmation. A failed fetch ({@link error}) renders the Spartan `hlmEmpty` error composition
 * instead of the grid, the same treatment `InterventionFacilitiesTable` and its "Linked" siblings
 * give their own list failure. Its own error and empty states carry a Retry and a "New recurrence"
 * action ({@link retryRequested}, {@link createRequested}) rather than leaving the tab a dead end.
 *
 * @version 1.4.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-recurrence-table',
  imports: [
    NgIcon,
    ...HlmEmptyImports,
    ...HlmItemImports,
    NgTemplateOutlet,
    CollectionSurface,
    OrgDatePipe,
    ResourceIllustration,
    HlmButton,
    ...HlmDropdownMenuImports,
    HlmSwitch,
    ...HlmTableImports,
    ...HlmTooltipImports,
  ],
  providers: [
    provideIcons({
      lucideCalendarClock,
      lucideCircleAlert,
      lucideEllipsis,
      lucidePause,
      lucidePencil,
      lucideTrash2,
    }),
  ],
  templateUrl: './intervention-recurrence-table.component.html',
  host: { class: 'flex min-h-0 w-full flex-1 flex-col' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionRecurrenceTable {
  /**
   * Property locale
   * @readonly
   *
   * @description
   * The active locale, resolving {@link frequencyLabelOf}'s cadence plural and
   * {@link lastDraftedLabelOf}.
   *
   * @access private
   * @since unreleased
   *
   * @type {string}
   */
  private readonly locale: string = inject(LOCALE_ID);

  //#region Inputs
  /**
   * Property recurrences
   * @readonly
   *
   * @description
   * The organization's recurrences, in the order the API returned them.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly InterventionRecurrenceOutput[]>}
   */
  public readonly recurrences: InputSignal<readonly InterventionRecurrenceOutput[]> =
    input.required<readonly InterventionRecurrenceOutput[]>();

  /**
   * Property templates
   * @readonly
   *
   * @description
   * The organization's intervention templates, resolving a row's template name.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly InterventionTemplateOutput[]>}
   */
  public readonly templates: InputSignal<readonly InterventionTemplateOutput[]> = input<
    readonly InterventionTemplateOutput[]
  >([]);

  /**
   * Property loading
   * @readonly
   *
   * @description
   * Whether the recurrence list's own fetch is in flight.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly loading: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property error
   * @readonly
   *
   * @description
   * The recurrence list's own fetch error, or `null`.
   *
   * @access public
   * @since 1.1.0
   *
   * @type {InputSignal<string | null>}
   */
  public readonly error: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property savingIds
   * @readonly
   *
   * @description
   * Ids of recurrences whose update writes are in flight; all their row actions are disabled.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly string[]>}
   */
  public readonly savingIds: InputSignal<readonly string[]> = input<readonly string[]>([]);

  /**
   * Property removingIds
   * @readonly
   *
   * @description
   * Ids of recurrences whose delete writes are in flight; all their row actions are disabled.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly string[]>}
   */
  public readonly removingIds: InputSignal<readonly string[]> = input<readonly string[]>([]);

  /**
   * Property canWrite
   * @readonly
   *
   * @description
   * Whether the viewer holds `organization.interventions.plan` — gates the active toggle and the
   * edit/delete affordances.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly canWrite: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property regionalFormatting
   * @readonly
   *
   * @description
   * The active organization's date pattern and timezone, bound by the page. The default keeps the
   * component renderable with no context wired.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<RegionalFormatSettings>}
   */
  public readonly regionalFormatting: InputSignal<RegionalFormatSettings> =
    input<RegionalFormatSettings>(DEFAULT_REGIONAL_FORMAT_SETTINGS);
  //#endregion

  //#region Outputs
  /**
   * Property editRequested
   * @readonly
   *
   * @description
   * A row's edit was asked for; the owning page opens a form seeded from this recurrence.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<InterventionRecurrenceOutput>}
   */
  public readonly editRequested: OutputEmitterRef<InterventionRecurrenceOutput> =
    output<InterventionRecurrenceOutput>();

  /**
   * Property removed
   * @readonly
   *
   * @description
   * A row's Delete action was pressed; the owning page decides what happens next, including any
   * confirmation.
   *
   * @access public
   * @since 1.2.0
   *
   * @type {OutputEmitterRef<InterventionRecurrenceOutput>}
   */
  public readonly removed: OutputEmitterRef<InterventionRecurrenceOutput> =
    output<InterventionRecurrenceOutput>();

  /**
   * Property activeToggled
   * @readonly
   *
   * @description
   * A row's active toggle was flipped.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<{ recurrenceId: string; isActive: boolean }>}
   */
  public readonly activeToggled: OutputEmitterRef<{
    readonly recurrenceId: string;
    readonly isActive: boolean;
  }> = output();

  /**
   * Property createRequested
   * @readonly
   *
   * @description
   * The empty state's "New recurrence" action was pressed; the owning page opens the create sheet.
   *
   * @access public
   * @since 6.4.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly createRequested: OutputEmitterRef<void> = output<void>();

  /**
   * Property retryRequested
   * @readonly
   *
   * @description
   * The error state's Retry action was pressed; the owning page re-runs the recurrence list fetch.
   *
   * @access public
   * @since 6.4.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly retryRequested: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Properties
  /**
   * Property skeletonColumnWidths
   * @readonly
   *
   * @description
   * Placeholder-column widths used while the recurrence list is loading.
   * One literal width or alignment class per rendered column, handed to the shared skeleton rows.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {readonly string[]}
   */
  protected readonly skeletonColumnWidths: readonly string[] = [
    'w-32 max-w-full',
    'w-28 max-w-full',
    'w-24',
    'w-24',
    'mx-auto h-5 w-9',
    'ms-auto w-20',
  ];
  //#endregion

  //#region Methods
  /**
   * Method templateNameOf
   * @method templateNameOf
   *
   * @description
   * Resolves a recurrence's template name, or the raw IRI while the catalog is still loading.
   *
   * @access protected
   * @since unreleased
   *
   * @param {string} templateIri - Template resource identifier whose display name is resolved.
   *
   * @returns {string}
   */
  protected templateNameOf(templateIri: string): string {
    const templateId: string = templateIri.slice(templateIri.lastIndexOf('/') + 1);

    return (
      this.templates().find((template): boolean => template.id === templateId)?.name ?? templateIri
    );
  }

  /**
   * Method frequencyLabelOf
   * @method frequencyLabelOf
   *
   * @description
   * Names a recurrence's full cadence ("Weekly", "Every 2 weeks") for the table's cadence column.
   *
   * @access protected
   * @since unreleased
   *
   * @param {InterventionRecurrenceFrequency} frequency - Recurrence unit used to form the localized
   *   cadence label.
   * @param {number} interval - Number of recurrence units between occurrences.
   *
   * @returns {string}
   */
  protected frequencyLabelOf(frequency: InterventionRecurrenceFrequency, interval: number): string {
    return interventionRecurrenceFrequencyLabel(frequency, interval, this.locale);
  }

  /**
   * Method rowAriaLabelOf
   * @method rowAriaLabelOf
   *
   * @description
   * Accessible name for one row control, folding in the recurrence's own
   * name so the otherwise identical switches and Edit/Delete entries stay
   * distinguishable in a screen reader's control list.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {'activate' | 'deactivate' | 'edit' | 'menu' | 'remove'} kind - The control named.
   * @param {string} name - The recurrence's name.
   *
   * @returns {string} The localized accessible name.
   */
  protected rowAriaLabelOf(
    kind: 'activate' | 'deactivate' | 'edit' | 'menu' | 'remove',
    name: string,
  ): string {
    switch (kind) {
      case 'activate':
        return $localize`:@@intervention.recurrences.activateAria:Activate ${name}:name:`;
      case 'deactivate':
        return $localize`:@@intervention.recurrences.deactivateAria:Deactivate ${name}:name:`;
      case 'edit':
        return $localize`:@@intervention.recurrences.editAria:Edit ${name}:name:`;
      case 'menu':
        return $localize`:@@intervention.recurrences.menuAria:Actions for ${name}:name:`;
      case 'remove':
        return $localize`:@@intervention.recurrences.removeAria:Delete ${name}:name:`;
    }
  }

  /**
   * Method toggleActive
   * @method toggleActive
   *
   * @description
   * Emits {@link activeToggled} for the flipped row.
   *
   * @access protected
   * @since unreleased
   *
   * @param {string} recurrenceId - Recurrence whose enabled state is changed.
   * @param {boolean} isActive - Requested enabled state for the recurrence.
   *
   * @returns {void}
   */
  protected toggleActive(recurrenceId: string, isActive: boolean): void {
    this.activeToggled.emit({ recurrenceId, isActive });
  }

  /**
   * Method lastDraftedLabelOf
   * @method lastDraftedLabelOf
   *
   * @description
   * Names a row's `lastMaterializedAt` as proof the schedule actually
   * drafts — the relative label a planner reads at a glance, with the
   * absolute instant left to the caller's tooltip.
   *
   * @access protected
   * @since 6.4.0
   *
   * @param {string} lastMaterializedAt - The recurrence's `lastMaterializedAt`, already known
   *   non-null.
   *
   * @returns {string} The localized "Last drafted …" line.
   */
  protected lastDraftedLabelOf(lastMaterializedAt: string): string {
    return $localize`:@@intervention.recurrences.lastDrafted:Last drafted ${formatRelativeTime(lastMaterializedAt, this.locale)}:relative:`;
  }
  //#endregion
}
