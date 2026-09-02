import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  output,
  signal,
  type InputSignal,
  type OutputEmitterRef,
  type WritableSignal,
} from '@angular/core';
import { form, FormField, maxLength, required, type FieldTree } from '@angular/forms/signals';
import type {
  ChecklistItemDraft,
  ChecklistItemInput,
  CreateChecklistInput,
} from '@features/organization/features/checklists/models';
import { RequiredMarker } from '@shared/required-marker';
import { HlmButton } from '@shared/ui/button';
import { HlmCheckbox } from '@shared/ui/checkbox';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmInput } from '@shared/ui/input';

/** Matches `CreateChecklistInput.name`'s server-side bound (`Assert\Length(max: 255)`). */
const NAME_MAX_LENGTH = 255;
/** Matches `ChecklistItemInput.label`'s server-side bound. */
const ITEM_LABEL_MAX_LENGTH = 255;
/** Matches `ChecklistItemInput.description`'s server-side bound. */
const ITEM_DESCRIPTION_MAX_LENGTH = 1000;
/** Every checklist template starts at this version; there is no versioning UI yet (`FEATURE.md`). */
const INITIAL_VERSION = '1.0';

/** A blank checklist name draft. */
const EMPTY_NAME: { readonly name: string } = { name: '' };
/** A blank item row. */
const EMPTY_ITEM: ChecklistItemDraft = { label: '', description: '', required: true };

/**
 * Component ChecklistCreateForm
 * @class ChecklistCreateForm
 *
 * @description
 * Names a new checklist template and stages its items — added, removed and
 * simply reordered (move up/down) one row at a time, the same staged-list
 * shape `OnboardingFacilitiesForm` uses for its own draft rows. Items are
 * optional at creation (the backend accepts an empty list); the version is
 * fixed to `1.0` rather than exposed as a field, since there is no
 * versioning UI yet (`FEATURE.md`).
 *
 * Presentational: it validates and emits {@link submitted}; the hosting
 * dialog calls `ChecklistStore.create` (`ARCHITECTURE.md` §10.5).
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-checklist-create-form
 *   [visible]="createDialogVisible()"
 *   [pending]="store.isCreating()"
 *   (submitted)="create($event)"
 *   (cancelled)="createDialogVisible.set(false)"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-checklist-create-form',
  imports: [RequiredMarker, FormField, HlmButton, HlmCheckbox, HlmInput, ...HlmFieldImports],
  templateUrl: './checklist-create-form.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChecklistCreateForm {
  //#region Inputs
  /**
   * Property visible
   * @readonly
   * @description Whether the hosting overlay is open. Watched only to clear the draft the moment it closes, so a reopened dialog starts blank.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly visible: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property pending
   * @readonly
   * @description Whether the creation write is in flight, which locks the submit control.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Outputs
  /**
   * Property submitted
   * @readonly
   * @description Emits the validated creation payload.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<CreateChecklistInput>}
   */
  public readonly submitted: OutputEmitterRef<CreateChecklistInput> =
    output<CreateChecklistInput>();

  /**
   * Property cancelled
   * @readonly
   * @description The operator backed out without creating a checklist.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<void>}
   */
  public readonly cancelled: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Properties
  /** The checklist name draft. */
  protected readonly model: WritableSignal<{ readonly name: string }> = signal(EMPTY_NAME);

  /** Item rows staged for submission. */
  protected readonly staged: WritableSignal<ReadonlyArray<ChecklistItemDraft>> = signal<
    ReadonlyArray<ChecklistItemDraft>
  >([]);

  /** The row currently being drafted. */
  protected readonly itemDraft: WritableSignal<ChecklistItemDraft> =
    signal<ChecklistItemDraft>(EMPTY_ITEM);

  /**
   * Property nameForm
   * @readonly
   * @description The field tree and its rules for the checklist name.
   * @access protected
   * @since 1.0.0
   * @type {FieldTree<{ readonly name: string }>}
   */
  protected readonly nameForm: FieldTree<{ readonly name: string }> = form(
    this.model,
    (path): void => {
      required(path.name, {
        message: $localize`:@@checklists.form.nameRequired:Give the checklist a name.`,
      });
      maxLength(path.name, NAME_MAX_LENGTH, {
        message: $localize`:@@checklists.form.nameLength:Use at most 255 characters.`,
      });
    },
  );

  /**
   * Property itemDraftForm
   * @readonly
   * @description The field tree and its rules for the item row being drafted.
   * @access protected
   * @since 1.0.0
   * @type {FieldTree<ChecklistItemDraft>}
   */
  protected readonly itemDraftForm: FieldTree<ChecklistItemDraft> = form(
    this.itemDraft,
    (path): void => {
      required(path.label, {
        message: $localize`:@@checklists.form.itemLabelRequired:The item needs a label.`,
      });
      maxLength(path.label, ITEM_LABEL_MAX_LENGTH, {
        message: $localize`:@@checklists.form.itemLabelLength:Use at most 255 characters.`,
      });
      maxLength(path.description, ITEM_DESCRIPTION_MAX_LENGTH, {
        message: $localize`:@@checklists.form.itemDescriptionLength:Use at most 1000 characters.`,
      });
    },
  );
  //#endregion

  //#region Lifecycle
  /**
   * Method constructor
   * @constructor
   * @description Clears the name, staged items and item draft the moment {@link visible} turns false, so a reopened dialog never resumes a discarded draft.
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    effect((): void => {
      if (this.visible()) return;

      this.model.set(EMPTY_NAME);
      this.nameForm().reset();
      this.staged.set([]);
      this.itemDraft.set(EMPTY_ITEM);
      this.itemDraftForm().reset();
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method addItem
   * @description Stages the current item row and resets the draft.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected addItem(): void {
    this.itemDraftForm().markAsTouched();

    if (this.itemDraftForm().invalid()) return;

    this.staged.update((rows) => [...rows, this.itemDraft()]);
    this.itemDraft.set(EMPTY_ITEM);
    this.itemDraftForm().reset();
  }

  /**
   * Method removeItem
   * @description Drops a staged row before submission.
   * @access protected
   * @since 1.0.0
   * @param {number} index - Position of the row to remove.
   * @returns {void}
   */
  protected removeItem(index: number): void {
    this.staged.update((rows) => rows.filter((_, i) => i !== index));
  }

  /**
   * Method moveItem
   * @description Swaps a staged row with its previous or next neighbour, the checklist's own simple reordering.
   * @access protected
   * @since 1.0.0
   * @param {number} index - Position of the row to move.
   * @param {-1 | 1} direction - `-1` moves the row up, `1` moves it down.
   * @returns {void}
   */
  protected moveItem(index: number, direction: -1 | 1): void {
    const target: number = index + direction;

    this.staged.update((rows) => {
      if (target < 0 || target >= rows.length) return rows;

      const next: ChecklistItemDraft[] = [...rows];
      [next[index], next[target]] = [next[target], next[index]];

      return next;
    });
  }

  /**
   * Method submit
   * @description Marks the name field touched so an unmet rule shows, then emits once valid.
   * @access protected
   * @since 1.0.0
   * @param {Event} event - The submit event.
   * @returns {void}
   */
  protected submit(event: Event): void {
    event.preventDefault();

    this.nameForm().markAsTouched();

    if (this.nameForm().invalid() || this.pending()) return;

    const items: ReadonlyArray<ChecklistItemInput> = this.staged().map(
      (draft: ChecklistItemDraft, position: number): ChecklistItemInput => ({
        label: draft.label.trim(),
        description: draft.description.trim() === '' ? undefined : draft.description.trim(),
        required: draft.required,
        position,
      }),
    );

    this.submitted.emit({ name: this.model().name.trim(), version: INITIAL_VERSION, items });
  }
  //#endregion
}
