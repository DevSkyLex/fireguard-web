import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
  untracked,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import type { BrnDialogState } from '@spartan-ng/brain/dialog';
import type {
  InterventionRecurrenceFrequency,
  InterventionRecurrenceOutput,
  InterventionTemplateOutput,
  MemberSelectOption,
  SelectOption,
} from '@features/organization/features/interventions/models';
import { sheetSide } from '@shared/sheet-side';
import { HlmButton } from '@shared/ui/button';
import { HlmComboboxImports } from '@shared/ui/combobox';
import { HlmDatePickerImports } from '@shared/ui/date-picker';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmInput } from '@shared/ui/input';
import { HlmSelectImports } from '@shared/ui/select';
import { HlmSheetImports } from '@shared/ui/sheet';
import { HlmSwitch } from '@shared/ui/switch';
import { HlmTableImports } from '@shared/ui/table';

/** The anchor-day-of-month past which the backend's own documented caveat applies: occurrences drift after a short month. */
const ANCHOR_DRIFT_DAY_THRESHOLD = 28;

/** What the embedded form is editing: a brand-new draft, an existing row, or nothing (closed). */
export type InterventionRecurrenceFormTarget = 'create' | InterventionRecurrenceOutput | null;

/** A submitted recurrence draft — the create form's shape, reused by the edit form (its `recurrenceId` is `null` for a create). */
export interface InterventionRecurrenceFormSubmittedEvent {
  readonly recurrenceId: string | null;
  readonly name: string;
  readonly templateId: string;
  readonly site: string | null;
  readonly responsible: string | null;
  readonly frequency: InterventionRecurrenceFrequency;
  readonly interval: number;
  readonly anchorDate: Date;
  readonly timezone: string;
  readonly leadTimeDays: number;
  readonly endAt: Date | null;
}

const FREQUENCIES: readonly InterventionRecurrenceFrequency[] = [
  'weekly',
  'monthly',
  'quarterly',
  'semiannual',
  'annual',
];

/**
 * Component InterventionRecurrencesSheet
 * @class InterventionRecurrencesSheet
 *
 * @description
 * The organization's recurring intervention schedules: a table (name,
 * template, cadence, next occurrence, active toggle) plus an embedded
 * create/edit form, reached from the interventions list toolbar. Gated by
 * the caller on `organization.interventions.read` to see and `.plan` to
 * write — {@link canWrite} hides every write affordance (new/edit/delete/
 * toggle) when false, leaving a read-only table.
 *
 * Purely presentational (`ARCHITECTURE.md` §10.5): it owns no store and
 * takes its open state from {@link open}. The create/edit draft is this
 * sheet's own state, reseeded whenever {@link formTarget} changes; the
 * caller owns every write and decides what to dispatch from
 * {@link submitted}/{@link removed}/{@link activeToggled}.
 *
 * A materialized intervention carries no back-reference to the recurrence
 * that produced it — the table's template column is resolved by name only,
 * from {@link templates}, never linked into a materialized intervention.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-recurrences-sheet',
  imports: [
    DatePipe,
    HlmButton,
    HlmInput,
    HlmSwitch,
    ...HlmComboboxImports,
    ...HlmDatePickerImports,
    ...HlmFieldImports,
    ...HlmSelectImports,
    ...HlmSheetImports,
    ...HlmTableImports,
  ],
  templateUrl: './intervention-recurrences-sheet.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionRecurrencesSheet {
  //#region Inputs
  /** Whether the sheet is open. Owned by the caller. */
  public readonly open: InputSignal<boolean> = input<boolean>(false);

  /** The organization's recurrences. */
  public readonly recurrences: InputSignal<readonly InterventionRecurrenceOutput[]> = input<
    readonly InterventionRecurrenceOutput[]
  >([]);

  /** The organization's intervention templates — the form's template select, and the table's name resolver. */
  public readonly templates: InputSignal<readonly InterventionTemplateOutput[]> = input<
    readonly InterventionTemplateOutput[]
  >([]);

  /** The organization's root facilities, for the form's site override. */
  public readonly siteOptions: InputSignal<readonly SelectOption[]> = input<
    readonly SelectOption[]
  >([]);

  /** The organization's members, for the form's responsible override. */
  public readonly memberOptions: InputSignal<readonly MemberSelectOption[]> = input<
    readonly MemberSelectOption[]
  >([]);

  /** Whether the table is loading. */
  public readonly loading: InputSignal<boolean> = input<boolean>(false);

  /** Whether the create form's submit is in flight. */
  public readonly creating: InputSignal<boolean> = input<boolean>(false);

  /** Id of the recurrence whose update write is in flight, if any (covers the edit form and the active toggle alike). */
  public readonly savingId: InputSignal<string | null> = input<string | null>(null);

  /** Id of the recurrence whose delete write is in flight, if any. */
  public readonly removingId: InputSignal<string | null> = input<string | null>(null);

  /** The last create/update failure message, if any. */
  public readonly formError: InputSignal<string | null> = input<string | null>(null);

  /** Whether the viewer holds `organization.interventions.plan` — gates every write affordance. */
  public readonly canWrite: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Outputs
  /** The sheet was closed. */
  public readonly closed: OutputEmitterRef<void> = output<void>();

  /** A create or edit draft was submitted. */
  public readonly submitted: OutputEmitterRef<InterventionRecurrenceFormSubmittedEvent> =
    output<InterventionRecurrenceFormSubmittedEvent>();

  /** A row's deletion was confirmed. */
  public readonly removed: OutputEmitterRef<string> = output<string>();

  /** A row's active toggle was flipped. */
  public readonly activeToggled: OutputEmitterRef<{
    readonly recurrenceId: string;
    readonly isActive: boolean;
  }> = output();
  //#endregion

  //#region Properties
  /** The sheet state, derived from {@link open}. */
  protected readonly sheetState: Signal<BrnDialogState> = computed<BrnDialogState>(() =>
    this.open() ? 'open' : 'closed',
  );

  /** The panel's side — bottom drawer below `sm`, right panel at and above it. */
  protected readonly side: Signal<'right' | 'bottom'> = sheetSide();

  /** What the embedded form is editing, or `null` when it is closed. */
  protected readonly formTarget: WritableSignal<InterventionRecurrenceFormTarget> =
    signal<InterventionRecurrenceFormTarget>(null);

  /** The row pending a delete confirmation, or `null`. */
  protected readonly confirmingRemoveId: WritableSignal<string | null> = signal<string | null>(
    null,
  );

  /** Every declared cadence unit, in select order. */
  protected readonly frequencies: readonly InterventionRecurrenceFrequency[] = FREQUENCIES;

  /** Form draft: name. */
  protected readonly draftName: WritableSignal<string> = signal<string>('');
  /** Form draft: template id. */
  protected readonly draftTemplateId: WritableSignal<string | null> = signal<string | null>(null);
  /** Form draft: site override. */
  protected readonly draftSite: WritableSignal<string | null> = signal<string | null>(null);
  /** Form draft: responsible override. */
  protected readonly draftResponsible: WritableSignal<string | null> = signal<string | null>(null);
  /** Form draft: cadence unit. */
  protected readonly draftFrequency: WritableSignal<InterventionRecurrenceFrequency> =
    signal<InterventionRecurrenceFrequency>('monthly');
  /** Form draft: cadence multiplier. */
  protected readonly draftInterval: WritableSignal<number> = signal<number>(1);
  /** Form draft: anchor date. */
  protected readonly draftAnchorDate: WritableSignal<Date | null> = signal<Date | null>(null);
  /** Form draft: IANA timezone — the browser's own zone offered as the default. */
  protected readonly draftTimezone: WritableSignal<string> = signal<string>(
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  );
  /** Form draft: lead time in days. */
  protected readonly draftLeadTimeDays: WritableSignal<number> = signal<number>(7);
  /** Form draft: end date, or `null` for no end. */
  protected readonly draftEndAt: WritableSignal<Date | null> = signal<Date | null>(null);

  /** Whether the anchor-day drift hint should render — past the 28th, occurrences drift after a short month. */
  protected readonly anchorDriftHintVisible: Signal<boolean> = computed<boolean>(() => {
    const anchor: Date | null = this.draftAnchorDate();

    return anchor !== null && anchor.getDate() > ANCHOR_DRIFT_DAY_THRESHOLD;
  });

  /** Whether the form may submit. */
  protected readonly canSubmitForm: Signal<boolean> = computed<boolean>(
    () =>
      this.draftName().trim().length > 0 &&
      this.draftTemplateId() !== null &&
      this.draftAnchorDate() !== null &&
      this.draftTimezone().trim().length > 0 &&
      !this.creating() &&
      this.savingId() === null,
  );

  /** Names a picked template on a closed select trigger. */
  protected readonly templateLabelOf: (value: string) => string = (value: string): string =>
    this.templates().find((template): boolean => template.id === value)?.name ?? '';

  /** Names a picked site on a closed select trigger. */
  protected readonly siteLabelOf: (value: string) => string = (value: string): string =>
    this.siteOptions().find((option): boolean => option.value === value)?.label ?? '';

  /** Names a picked responsible on a closed combobox trigger. */
  protected readonly memberLabelOf: (value: string) => string = (value: string): string =>
    this.memberOptions().find((option): boolean => option.value === value)?.displayName ?? '';

  /** Resolves a recurrence's template name for the table, or the raw IRI while the catalog is still loading. */
  protected readonly templateNameOf: (templateIri: string) => string = (
    templateIri: string,
  ): string => {
    const templateId: string = templateIri.slice(templateIri.lastIndexOf('/') + 1);

    return (
      this.templates().find((template): boolean => template.id === templateId)?.name ?? templateIri
    );
  };
  //#endregion

  //#region Constructor
  /** Reseeds the form draft whenever {@link formTarget} changes, and clears everything on close. */
  public constructor() {
    effect((): void => {
      const target: InterventionRecurrenceFormTarget = this.formTarget();

      untracked((): void => {
        if (target === null) return;
        if (target === 'create') {
          this.draftName.set('');
          this.draftTemplateId.set(null);
          this.draftSite.set(null);
          this.draftResponsible.set(null);
          this.draftFrequency.set('monthly');
          this.draftInterval.set(1);
          this.draftAnchorDate.set(null);
          this.draftTimezone.set(Intl.DateTimeFormat().resolvedOptions().timeZone);
          this.draftLeadTimeDays.set(7);
          this.draftEndAt.set(null);
          return;
        }

        this.draftName.set(target.name);
        this.draftTemplateId.set(target.template.slice(target.template.lastIndexOf('/') + 1));
        this.draftSite.set(target.site);
        this.draftResponsible.set(target.responsible);
        this.draftFrequency.set(target.frequency);
        this.draftInterval.set(target.interval);
        this.draftAnchorDate.set(new Date(target.anchorDate));
        this.draftTimezone.set(target.timezone);
        this.draftLeadTimeDays.set(target.leadTimeDays);
        this.draftEndAt.set(target.endAt ? new Date(target.endAt) : null);
      });
    });

    effect((): void => {
      if (this.open()) return;

      untracked((): void => {
        this.formTarget.set(null);
        this.confirmingRemoveId.set(null);
      });
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method onStateChanged
   *
   * @description Relays a dismissal — Escape or the backdrop.
   * @access protected
   * @since 1.0.0
   * @param {BrnDialogState} state - The sheet's new state.
   * @returns {void}
   */
  protected onStateChanged(state: BrnDialogState): void {
    if (state === 'open') return;

    this.closed.emit();
  }

  /** Opens the embedded form for a brand-new recurrence. */
  protected startCreate(): void {
    this.confirmingRemoveId.set(null);
    this.formTarget.set('create');
  }

  /** Opens the embedded form for an existing recurrence. */
  protected startEdit(recurrence: InterventionRecurrenceOutput): void {
    this.confirmingRemoveId.set(null);
    this.formTarget.set(recurrence);
  }

  /** Closes the embedded form without submitting. */
  protected cancelForm(): void {
    this.formTarget.set(null);
  }

  /**
   * Method submitForm
   *
   * @description Emits {@link submitted} for the current draft — `recurrenceId` is `null` on a create, the row's id on an edit.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected submitForm(): void {
    const templateId: string | null = this.draftTemplateId();
    const anchorDate: Date | null = this.draftAnchorDate();
    const name: string = this.draftName().trim();
    if (!templateId || !anchorDate || !name) return;

    const target: InterventionRecurrenceFormTarget = this.formTarget();

    this.submitted.emit({
      recurrenceId: target !== null && target !== 'create' ? target.id : null,
      name,
      templateId,
      site: this.draftSite(),
      responsible: this.draftResponsible(),
      frequency: this.draftFrequency(),
      interval: this.draftInterval(),
      anchorDate,
      timezone: this.draftTimezone().trim(),
      leadTimeDays: this.draftLeadTimeDays(),
      endAt: this.draftEndAt(),
    });
  }

  /** Opens a row's inline delete confirmation. */
  protected requestRemove(recurrenceId: string): void {
    this.formTarget.set(null);
    this.confirmingRemoveId.set(recurrenceId);
  }

  /** Emits {@link removed} for the confirmed row. */
  protected confirmRemove(recurrenceId: string): void {
    this.confirmingRemoveId.set(null);
    this.removed.emit(recurrenceId);
  }

  /** Emits {@link activeToggled} for the flipped row. */
  protected toggleActive(recurrenceId: string, isActive: boolean): void {
    this.activeToggled.emit({ recurrenceId, isActive });
  }
  //#endregion
}
