import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
} from '@angular/core';
import { provideIcons } from '@ng-icons/core';
import { lucideCalendarClock, lucideCircleAlert } from '@ng-icons/lucide';
import type {
  InterventionRecurrenceFrequency,
  InterventionRecurrenceOutput,
  InterventionTemplateOutput,
} from '@features/organization/features/interventions/models';
import { interventionRecurrenceFrequencyLabel } from '@features/organization/features/interventions/utils';
import { EmptyState } from '@shared/empty-state';
import { ErrorState } from '@shared/error-state';
import { HlmButton } from '@shared/ui/button';
import { HlmSkeleton } from '@shared/ui/skeleton';
import { HlmSwitch } from '@shared/ui/switch';
import { HlmTableImports } from '@shared/ui/table';

/** Placeholder rows drawn while the recurrence list's own fetch is in flight. */
const SKELETON_ROWS: ReadonlyArray<number> = [1, 2, 3];

/**
 * Component InterventionRecurrenceTable
 * @class InterventionRecurrenceTable
 *
 * @description
 * The organization's recurring intervention schedules, as a full-width
 * `hlmTable` grid: name, template, cadence, next occurrence, an active
 * toggle, and a row's edit/delete affordances. This table only renders the
 * list and reports row intents through {@link editRequested}, {@link removed}
 * and {@link activeToggled} — the owning page decides what a row's Delete
 * action means, including any confirmation.
 *
 * A failed fetch ({@link error}) renders `ErrorState` instead of the grid,
 * the same treatment `InterventionFacilitiesTable` and its "Linked" siblings
 * give their own list failure.
 *
 * @version 1.2.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-recurrence-table',
  imports: [
    DatePipe,
    EmptyState,
    ErrorState,
    HlmButton,
    HlmSkeleton,
    HlmSwitch,
    ...HlmTableImports,
  ],
  providers: [provideIcons({ lucideCalendarClock, lucideCircleAlert })],
  templateUrl: './intervention-recurrence-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionRecurrenceTable {
  //#region Inputs
  /**
   * Property recurrences
   * @readonly
   * @description The organization's recurrences, in the order the API returned them.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly InterventionRecurrenceOutput[]>}
   */
  public readonly recurrences: InputSignal<readonly InterventionRecurrenceOutput[]> =
    input.required<readonly InterventionRecurrenceOutput[]>();

  /**
   * Property templates
   * @readonly
   * @description The organization's intervention templates, resolving a row's template name.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly InterventionTemplateOutput[]>}
   */
  public readonly templates: InputSignal<readonly InterventionTemplateOutput[]> = input<
    readonly InterventionTemplateOutput[]
  >([]);

  /**
   * Property loading
   * @readonly
   * @description Whether the recurrence list's own fetch is in flight.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly loading: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property error
   * @readonly
   * @description The recurrence list's own fetch error, or `null`.
   * @access public
   * @since 1.1.0
   * @type {InputSignal<string | null>}
   */
  public readonly error: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property savingId
   * @readonly
   * @description Id of the recurrence whose update write is in flight, if any — disables that row's active toggle.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string | null>}
   */
  public readonly savingId: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property removingId
   * @readonly
   * @description Id of the recurrence whose delete write is in flight, if any — disables that row's confirm button.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string | null>}
   */
  public readonly removingId: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property canWrite
   * @readonly
   * @description Whether the viewer holds `organization.interventions.plan` — gates the active toggle and the edit/delete affordances.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly canWrite: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Outputs
  /**
   * Property editRequested
   * @readonly
   * @description A row's edit was asked for; the owning page opens a form seeded from this recurrence.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<InterventionRecurrenceOutput>}
   */
  public readonly editRequested: OutputEmitterRef<InterventionRecurrenceOutput> =
    output<InterventionRecurrenceOutput>();

  /**
   * Property removed
   * @readonly
   * @description A row's Delete action was pressed; the owning page decides what happens next, including any confirmation.
   * @access public
   * @since 1.2.0
   * @type {OutputEmitterRef<InterventionRecurrenceOutput>}
   */
  public readonly removed: OutputEmitterRef<InterventionRecurrenceOutput> =
    output<InterventionRecurrenceOutput>();

  /**
   * Property activeToggled
   * @readonly
   * @description A row's active toggle was flipped.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<{ recurrenceId: string; isActive: boolean }>}
   */
  public readonly activeToggled: OutputEmitterRef<{
    readonly recurrenceId: string;
    readonly isActive: boolean;
  }> = output();
  //#endregion

  //#region Properties
  /** Placeholder rows for the loading render. */
  protected readonly skeletonRows: ReadonlyArray<number> = SKELETON_ROWS;
  //#endregion

  //#region Methods
  /** Resolves a recurrence's template name, or the raw IRI while the catalog is still loading. */
  protected templateNameOf(templateIri: string): string {
    const templateId: string = templateIri.slice(templateIri.lastIndexOf('/') + 1);

    return (
      this.templates().find((template): boolean => template.id === templateId)?.name ?? templateIri
    );
  }

  /** Names a cadence unit for the table's cadence column. */
  protected frequencyLabelOf(frequency: InterventionRecurrenceFrequency): string {
    return interventionRecurrenceFrequencyLabel(frequency);
  }

  /**
   * Method rowAriaLabelOf
   *
   * @description
   * Accessible name for one row control, folding in the recurrence's own
   * name so the otherwise identical switches and Edit/Delete entries stay
   * distinguishable in a screen reader's control list.
   *
   * @access protected
   * @since 1.0.0
   * @param {'activate' | 'deactivate' | 'edit' | 'remove'} kind - The control named.
   * @param {string} name - The recurrence's name.
   * @returns {string} The localized accessible name.
   */
  protected rowAriaLabelOf(
    kind: 'activate' | 'deactivate' | 'edit' | 'remove',
    name: string,
  ): string {
    switch (kind) {
      case 'activate':
        return $localize`:@@intervention.recurrences.activateAria:Activate ${name}:name:`;
      case 'deactivate':
        return $localize`:@@intervention.recurrences.deactivateAria:Deactivate ${name}:name:`;
      case 'edit':
        return $localize`:@@intervention.recurrences.editAria:Edit ${name}:name:`;
      case 'remove':
        return $localize`:@@intervention.recurrences.removeAria:Delete ${name}:name:`;
    }
  }

  /** Emits {@link activeToggled} for the flipped row. */
  protected toggleActive(recurrenceId: string, isActive: boolean): void {
    this.activeToggled.emit({ recurrenceId, isActive });
  }
  //#endregion
}
