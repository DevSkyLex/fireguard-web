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
  type Signal,
  type OutputEmitterRef,
  type WritableSignal,
} from '@angular/core';
import { form, FormField, validate, type FieldTree } from '@angular/forms/signals';
import type {
  InterventionWorkItemOutput,
  UpdateInterventionWorkItemInput,
  MemberSelectOption,
} from '@features/organization/features/interventions/models';
import { WorkloadAssigneeIndicator } from '@features/organization/features/workload/ui/components/workload-assignee-indicator';
import { HlmAvatarImports } from '@shared/ui/avatar';
import { HlmButton } from '@shared/ui/button';
import { HlmComboboxImports } from '@shared/ui/combobox';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmInput } from '@shared/ui/input';
import { HlmInputGroupAddon } from '@shared/ui/input-group';
import type { InterventionEffortValues } from './models/intervention-effort-values.interface';

/**
 * Component InterventionEffortForm
 * @class InterventionEffortForm
 *
 * @description
 * Separates factual remaining-work reestimation from planning changes requiring overload consent.
 *
 * @version 1.0.0
 */
@Component({
  selector: 'app-intervention-effort-form',
  templateUrl: './intervention-effort-form.component.html',
  imports: [
    HlmInputGroupAddon,
    HlmAvatarImports,
    WorkloadAssigneeIndicator,
    FormField,
    HlmButton,
    HlmFieldImports,
    HlmInput,
    HlmComboboxImports,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionEffortForm {
  /**
   * Property selectedMemberOption
   * @readonly
   *
   * @description
   * Organization identity of the selected member; the submitted identifier remains unchanged.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<MemberSelectOption | null>}
   */
  protected readonly selectedMemberOption: Signal<MemberSelectOption | null> = computed(
    () => this.members().find((member) => member.value === this.model().assignee) ?? null,
  );

  /**
   * Property workloadOrganizationId
   * @readonly
   *
   * @description
   * Organization used for optional assignment load.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly workloadOrganizationId: InputSignal<string> = input('');

  /**
   * Property workloadStartsOn
   * @readonly
   *
   * @description
   * Inherited intervention period start.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string | null>}
   */
  public readonly workloadStartsOn: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property workloadEndsOn
   * @readonly
   *
   * @description
   * Inherited intervention period end.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string | null>}
   */
  public readonly workloadEndsOn: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property item
   * @readonly
   *
   * @description
   * Captured task revision.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<InterventionWorkItemOutput>}
   */
  public readonly item: InputSignal<InterventionWorkItemOutput> =
    input.required<InterventionWorkItemOutput>();

  /**
   * Property mode
   * @readonly
   *
   * @description
   * Explicit editing intent.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<'remaining' | 'planning'>}
   */
  public readonly mode: InputSignal<'remaining' | 'planning'> = input.required<
    'remaining' | 'planning'
  >();

  /**
   * Property members
   * @readonly
   *
   * @description
   * Authorized assignment options.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly MemberSelectOption[]>}
   */
  public readonly members: InputSignal<readonly MemberSelectOption[]> = input<
    readonly MemberSelectOption[]
  >([]);

  /**
   * Property pending
   * @readonly
   *
   * @description
   * Write in flight.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input(false);

  /**
   * Property submitted
   * @readonly
   *
   * @description
   * Explicit changes only.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<UpdateInterventionWorkItemInput>}
   */
  public readonly submitted: OutputEmitterRef<UpdateInterventionWorkItemInput> = output();

  /**
   * Property dirtyChanged
   * @readonly
   *
   * @description
   * Enables unsaved-edit protection.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<boolean>}
   */
  public readonly dirtyChanged: OutputEmitterRef<boolean> = output();

  /**
   * Property model
   * @readonly
   *
   * @description
   * Nullable effort stays blank rather than zero.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<InterventionEffortValues>}
   */
  protected readonly model: WritableSignal<InterventionEffortValues> = signal({
    minutes: '',
    assignee: '',
    workStartsOn: '',
    workEndsOn: '',
  });

  /**
   * Property fields
   * @readonly
   *
   * @description
   * Validates only explicit effort and periods.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FieldTree<InterventionEffortValues>}
   */
  protected readonly fields: FieldTree<InterventionEffortValues> = form(this.model, (path) => {
    validate(path.minutes, ({ value }) =>
      !value() ||
      (/^\d+$/.test(value()) &&
        Number.isSafeInteger(Number(value())) &&
        Number(value()) <= 2147483647)
        ? null
        : {
            kind: 'minutes',
            message: $localize`:@@intervention.effort.wholeMinutes:Enter whole minutes, or leave empty if unknown.`,
          },
    );
    validate(path.workEndsOn, ({ value, valueOf }) =>
      this.mode() !== 'planning' ||
      (!value() && !valueOf(path.workStartsOn)) ||
      (Boolean(valueOf(path.workStartsOn)) &&
        Boolean(value()) &&
        value() >= valueOf(path.workStartsOn))
        ? null
        : {
            kind: 'period',
            message: $localize`:@@intervention.effort.period:Choose both dates in chronological order, or leave both blank.`,
          },
    );
  });

  /**
   * Property memberLabel
   * @readonly
   *
   * @description
   * Resolves the selected assignee.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {(value: string) => string}
   */
  protected readonly memberLabel: (value: string) => string = (value) =>
    this.members().find((member) => member.value === value)?.displayName ?? value;

  /**
   * Constructor
   * @constructor
   *
   * @description
   * Seeds the reviewed task once and reports dirty state.
   *
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    effect(() => {
      const item = this.item();
      const mode = this.mode();
      untracked(() =>
        this.fields().reset({
          minutes: String(
            (mode === 'remaining' ? item.remainingMinutes : item.estimatedMinutes) ?? '',
          ),
          assignee: item.assignee ?? '',
          workStartsOn: item.workStartsOn ?? '',
          workEndsOn: item.workEndsOn ?? '',
        }),
      );
    });
    effect(() => {
      const dirty = this.fields().dirty();
      untracked(() => this.dirtyChanged.emit(dirty));
    });
  }

  /**
   * Method assigneeChanged
   * @method assigneeChanged
   *
   * @description
   * Marks an explicit reassignment, including clearing the assignee.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string | null | undefined} value - Selected member IRI.
   * @returns {void}
   */
  protected assigneeChanged(value: string | null | undefined): void {
    this.model.update((current) => ({ ...current, assignee: value ?? '' }));
    this.fields.assignee().markAsDirty();
  }

  /**
   * Method submit
   * @method submit
   *
   * @description
   * Emits reestimation independently from assignment and estimate changes.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {Event} event - Native form event.
   * @returns {void}
   */
  protected submit(event: Event): void {
    event.preventDefault();
    this.fields().markAsTouched();
    if (this.pending() || this.fields().invalid()) return;
    const value = this.model();
    const minutes = value.minutes === '' ? null : Number(value.minutes);
    this.submitted.emit(
      this.mode() === 'remaining'
        ? { remainingMinutes: minutes }
        : {
            estimatedMinutes: minutes,
            assignee: value.assignee || null,
            workStartsOn: value.workStartsOn || null,
            workEndsOn: value.workEndsOn || null,
          },
    );
  }
}
