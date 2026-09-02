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
import { form, FormField, required, type FieldTree } from '@angular/forms/signals';
import {
  resolveInterventionTag,
  type InterventionWorkItemAction,
  type MemberSelectOption,
  type SelectOption,
} from '@features/organization/features/interventions/models';
import { serverMessagesOf } from '@shared/form-feedback';
import { PersonOption } from '@shared/person-option';
import { RequiredMarker } from '@shared/required-marker';
import { HlmAvatarImports } from '@shared/ui/avatar';
import { HlmButton } from '@shared/ui/button';
import { HlmComboboxImports } from '@shared/ui/combobox';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmSelectImports } from '@shared/ui/select';
import { HlmSheetFooter } from '@shared/ui/sheet';
import { InterventionTag } from '../../components/intervention-tag';
import type { InterventionWorkItemFormValues } from './models';

/** The kinds of field work an item can record. */
const ACTION_VALUES: ReadonlyArray<InterventionWorkItemAction> = [
  'site_setup',
  'inventory',
  'inspection',
];

/** A blank item. */
const EMPTY_VALUES: InterventionWorkItemFormValues = {
  action: 'inventory',
  target: '',
  assignee: '',
};

/**
 * Component InterventionWorkItemForm
 * @class InterventionWorkItemForm
 *
 * @description
 * A task being added to an intervention's prepared scope.
 *
 * Only the action is required. A target and an assignee are genuinely optional
 * — the backend accepts an item without either, and a planner often knows what
 * kind of work is needed before knowing which equipment or which agent.
 *
 * Its own host fills the flex column its hosting sheet establishes: the field
 * group scrolls independently while the `hlm-sheet-footer` action row stays
 * pinned, without the sheet needing to know about the form's internal layout.
 *
 * @version 1.1.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-work-item-form',
  imports: [
    RequiredMarker,
    PersonOption,
    FormField,
    HlmButton,
    InterventionTag,
    ...HlmAvatarImports,
    ...HlmComboboxImports,
    ...HlmFieldImports,
    ...HlmSelectImports,
    HlmSheetFooter,
  ],
  templateUrl: './intervention-work-item-form.component.html',
  host: { class: 'flex min-h-0 flex-1 flex-col' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionWorkItemForm {
  //#region Inputs
  /**
   * Property pending
   * @readonly
   * @description Whether the creation request is in flight.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property disabled
   * @readonly
   * @description Whether the scope may still grow.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly disabled: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property serverError
   * @readonly
   * @description Whatever the creation failed with.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<unknown>}
   */
  public readonly serverError: InputSignal<unknown> = input<unknown>(null);

  /**
   * Property targetOptions
   * @readonly
   * @description The facilities and equipment an item can point at.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly SelectOption[]>}
   */
  public readonly targetOptions: InputSignal<readonly SelectOption[]> = input<
    readonly SelectOption[]
  >([]);

  /**
   * Property memberOptions
   * @readonly
   * @description The members an item can be assigned to.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly MemberSelectOption[]>}
   */
  public readonly memberOptions: InputSignal<readonly MemberSelectOption[]> = input<
    readonly MemberSelectOption[]
  >([]);
  //#endregion

  //#region Outputs
  /**
   * Property submitted
   * @readonly
   * @description The validated item, with its optional fields trimmed.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<InterventionWorkItemFormValues>}
   */
  public readonly submitted: OutputEmitterRef<InterventionWorkItemFormValues> =
    output<InterventionWorkItemFormValues>();

  /**
   * Property cancelled
   * @readonly
   * @description The planner backed out.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<void>}
   */
  public readonly cancelled: OutputEmitterRef<void> = output<void>();

  /**
   * Property dirtyChanged
   * @readonly
   *
   * @description
   * Emits whenever the field tree's dirtiness changes, so the hosting sheet
   * can confirm before an Escape or a backdrop tap discards the draft.
   *
   * @access public
   * @since 7.1.0
   *
   * @type {OutputEmitterRef<boolean>}
   */
  public readonly dirtyChanged: OutputEmitterRef<boolean> = output<boolean>();
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Relays the field tree's dirtiness through {@link dirtyChanged}, run
   * `untracked` so the emit does not re-trigger the effect it runs in.
   *
   * @access public
   * @since 7.1.0
   */
  public constructor() {
    effect((): void => {
      const dirty: boolean = this.workItemForm().dirty();

      untracked((): void => this.dirtyChanged.emit(dirty));
    });
  }
  //#endregion

  //#region Properties
  /**
   * Property actionValues
   * @readonly
   * @description Exposed for the action select.
   * @access protected
   * @since 1.0.0
   * @type {ReadonlyArray<InterventionWorkItemAction>}
   */
  protected readonly actionValues: ReadonlyArray<InterventionWorkItemAction> = ACTION_VALUES;

  /**
   * Property model
   * @readonly
   * @description The drafted item.
   * @access protected
   * @since 1.0.0
   * @type {WritableSignal<InterventionWorkItemFormValues>}
   */
  protected readonly model: WritableSignal<InterventionWorkItemFormValues> =
    signal<InterventionWorkItemFormValues>(EMPTY_VALUES);

  /**
   * Property workItemForm
   * @readonly
   * @description The three fields and the one rule that binds them.
   * @access protected
   * @since 1.0.0
   * @type {FieldTree<InterventionWorkItemFormValues>}
   */
  protected readonly workItemForm: FieldTree<InterventionWorkItemFormValues> = form(
    this.model,
    (path) => {
      required(path.action, {
        message: $localize`:@@intervention.wif.actionRequired:Choose what kind of work this item records.`,
      });
    },
  );

  /**
   * Property targetLabelOf
   * @readonly
   * @description Names a target IRI for the combobox trigger.
   * @access protected
   * @since 1.0.0
   * @type {(value: string) => string}
   */
  protected readonly targetLabelOf: (value: string) => string = (value) =>
    this.targetOptions().find((option) => option.value === value)?.label ??
    $localize`:@@common.unknownTarget:Unknown target`;

  /**
   * Property memberLabelOf
   * @readonly
   * @description Names a member IRI for the combobox trigger.
   * @access protected
   * @since 1.0.0
   * @type {(value: string) => string}
   */
  protected readonly memberLabelOf: (value: string) => string = (value) =>
    this.memberOptions().find((option) => option.value === value)?.displayName ??
    $localize`:@@common.unknownMember:Unknown member`;

  /**
   * Property actionLabelOf
   * @readonly
   * @description Names an action for the select's own value rendering.
   * @access protected
   * @since 1.0.0
   * @type {(value: InterventionWorkItemAction) => string}
   */
  protected readonly actionLabelOf: (value: InterventionWorkItemAction) => string = (value) =>
    resolveInterventionTag('workItemAction', value).label;

  /**
   * Property serverMessages
   * @readonly
   *
   * @description
   * Everything the API said about the rejected creation, as flat lines above
   * the fields — the same grouping the other forms use, for the same reason.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly string[]>}
   */
  protected readonly serverMessages: Signal<readonly string[]> = computed<readonly string[]>(() =>
    serverMessagesOf(
      this.serverError(),
      [],
      $localize`:@@intervention.workspace.workItemCreateFailed:The work item could not be created.`,
    ),
  );
  //#endregion

  //#region Methods
  /**
   * Method submit
   *
   * @description
   * Validates, then emits the item with its optional fields trimmed. The draft
   * is deliberately not reset: a rejected request must not wipe the planner's
   * input.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {Event} event - The form submission.
   *
   * @returns {void}
   */
  protected submit(event: Event): void {
    event.preventDefault();
    this.workItemForm().markAsTouched();

    if (this.workItemForm().invalid() || this.pending() || this.disabled()) return;

    const values: InterventionWorkItemFormValues = this.model();

    this.submitted.emit({
      action: values.action,
      target: values.target.trim(),
      assignee: values.assignee.trim(),
    });
  }
  //#endregion
}
