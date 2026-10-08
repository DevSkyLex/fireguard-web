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
import {
  disabled,
  form,
  FormField,
  maxLength,
  validate,
  type FieldTree,
} from '@angular/forms/signals';
import type {
  CreateEquipmentTypeInput,
  EquipmentTypeOutput,
} from '@features/organization/features/equipments/models';
import { HlmAlertImports } from '@shared/ui/alert';
import { HlmButton } from '@shared/ui/button';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmInput } from '@shared/ui/input';
import { HlmSpinner } from '@shared/ui/spinner';
import { HlmToggleGroupImports } from '@shared/ui/toggle-group';

/**
 * Class EquipmentTypeForm
 * @class EquipmentTypeForm
 *
 * @description
 * Creates and edits catalogue descriptors without owning transport or navigation.
 */
@Component({
  selector: 'app-equipment-type-form',
  templateUrl: './equipment-type-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormField,
    HlmButton,
    HlmInput,
    HlmSpinner,
    ...HlmFieldImports,
    ...HlmAlertImports,
    ...HlmToggleGroupImports,
  ],
})
export class EquipmentTypeForm {
  //#region Properties
  /**
   * Property entry
   * @readonly
   *
   * @description
   * Reviewed descriptor; null opens a fresh creation draft.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<EquipmentTypeOutput | null>}
   */
  public readonly entry: InputSignal<EquipmentTypeOutput | null> =
    input<EquipmentTypeOutput | null>(null);

  /**
   * Property pending
   * @readonly
   *
   * @description
   * Disables editing and duplicate submissions during a command.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input(false);

  /**
   * Property available
   * @readonly
   *
   * @description
   * Editing availability is independent of an accepted command, so offline drafts can be cancelled.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly available: InputSignal<boolean> = input(true);

  /**
   * Property error
   * @readonly
   *
   * @description
   * Rejected command detail displayed without resetting input.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string | null>}
   */
  public readonly error: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property submitted
   * @readonly
   *
   * @description
   * Validated fields; the page adds the reviewed revision when editing.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<CreateEquipmentTypeInput>}
   */
  public readonly submitted: OutputEmitterRef<CreateEquipmentTypeInput> =
    output<CreateEquipmentTypeInput>();

  /**
   * Property cancelled
   * @readonly
   *
   * @description
   * Requests cancellation; the page confirms discarding dirty input.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly cancelled: OutputEmitterRef<void> = output<void>();

  /**
   * Property dirtyChanged
   * @readonly
   *
   * @description
   * Reports actual field dirtiness for the host's dismissal protection.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<boolean>}
   */
  public readonly dirtyChanged: OutputEmitterRef<boolean> = output<boolean>();

  /**
   * Property draft
   * @readonly
   *
   * @description
   * Local validated catalogue draft, retained after rejection or revision refresh.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<CreateEquipmentTypeInput>}
   */
  protected readonly draft: WritableSignal<CreateEquipmentTypeInput> =
    signal<CreateEquipmentTypeInput>({ value: '', label: '', family: 'fire' });

  /**
   * Property fields
   * @readonly
   *
   * @description
   * Server-aligned code and label rules with an immutable edit code.
   *
   * @access protected
   * @since unreleased
   *
   * @type {FieldTree<CreateEquipmentTypeInput>}
   */
  protected readonly fields: FieldTree<CreateEquipmentTypeInput> = form(this.draft, (path) => {
    disabled(path, { when: () => this.pending() || !this.available() });
    disabled(path.value, { when: () => this.entry() !== null });
    validate(path.value, ({ value }) =>
      /^[a-z][a-z0-9_]{0,31}$/.test(value())
        ? null
        : {
            kind: 'code',
            message: $localize`:@@equipment.catalog.form.codeInvalid:Use 1–32 lowercase letters, digits or underscores, starting with a letter.`,
          },
    );
    maxLength(path.value, 32);
    validate(path.label, ({ value }) =>
      value().trim()
        ? null
        : {
            kind: 'required',
            message: $localize`:@@equipment.catalog.form.labelRequired:Enter an equipment type name.`,
          },
    );
    maxLength(path.label, 100, {
      message: $localize`:@@equipment.catalog.form.labelTooLong:Use at most 100 characters for the name.`,
    });
    validate(path.family, ({ value }) =>
      ['fire', 'safety', 'other'].includes(value())
        ? null
        : {
            kind: 'family',
            message: $localize`:@@equipment.catalog.form.familyRequired:Choose an equipment family.`,
          },
    );
  });

  /**
   * Property identity
   * @readonly
   *
   * @description
   * Revision refreshes retain the draft while selecting another code resets it.
   *
   * @access private
   * @since unreleased
   *
   * @type {Signal<string | null>}
   */
  private readonly identity: Signal<string | null> = computed(() => this.entry()?.value ?? null);

  /**
   * Property submitLabel
   * @readonly
   *
   * @description
   * Action caption reflects create or edit intent.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<string>}
   */
  protected readonly submitLabel: Signal<string> = computed(() =>
    this.entry()
      ? $localize`:@@equipment.catalog.form.save:Save type`
      : $localize`:@@equipment.catalog.form.create:Create type`,
  );
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Seeds record identity once and exposes real dirty state to the hosting editor.
   *
   * @access public
   * @since unreleased
   */
  public constructor() {
    effect(() => {
      this.identity();
      untracked(() => {
        const entry = this.entry();
        this.fields().reset(
          entry
            ? { value: entry.value, label: entry.label, family: entry.family }
            : { value: '', label: '', family: 'fire' },
        );
      });
    });
    effect(() => {
      const dirty = this.fields().dirty();
      untracked(() => this.dirtyChanged.emit(dirty));
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method familyChanged
   * @method familyChanged
   *
   * @description
   * Connects the installed toggle group to the typed Signal Form field.
   *
   * @access protected
   * @since unreleased
   *
   * @param {unknown} value - Native toggle selection.
   *
   * @returns {void}
   */
  protected familyChanged(value: unknown): void {
    if (
      this.pending() ||
      !this.available() ||
      (value !== 'fire' && value !== 'safety' && value !== 'other')
    )
      return;
    this.draft.update((draft) => ({ ...draft, family: value }));
    this.fields.family().markAsDirty();
  }

  /**
   * Method submit
   * @method submit
   *
   * @description
   * Emits validated input while leaving unsuccessful drafts intact.
   *
   * @access protected
   * @since unreleased
   *
   * @param {Event} event - Native form submission.
   *
   * @returns {void}
   */
  protected submit(event: Event): void {
    event.preventDefault();
    this.fields().markAsTouched();
    if (this.pending() || !this.available() || this.fields().invalid()) return;
    const draft = this.draft();
    this.submitted.emit({
      ...draft,
      value: this.entry()?.value ?? draft.value,
      label: draft.label.trim(),
    });
  }
  //#endregion
}
