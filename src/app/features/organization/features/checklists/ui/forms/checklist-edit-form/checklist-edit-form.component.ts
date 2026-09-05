import {
  ChangeDetectionStrategy,
  Component,
  effect,
  computed,
  input,
  output,
  signal,
  untracked,
  type InputSignal,
  type OutputEmitterRef,
  type WritableSignal,
} from '@angular/core';
import {
  applyEach,
  form,
  FormField,
  maxLength,
  required,
  type FieldTree,
} from '@angular/forms/signals';
import type {
  ChecklistItemDraft,
  ChecklistItemInput,
  ChecklistOutput,
  UpdateChecklistInput,
} from '@features/organization/features/checklists/models';
import { RequiredMarker } from '@shared/required-marker';
import { HlmButton } from '@shared/ui/button';
import { HlmCheckbox } from '@shared/ui/checkbox';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmInput } from '@shared/ui/input';

/** Matches `UpdateChecklistInput.name`'s server-side bound (`Assert\Length(max: 255)`). */
const NAME_MAX_LENGTH = 255;
/** Matches `ChecklistItemInput.label`'s server-side bound. */
const ITEM_LABEL_MAX_LENGTH = 255;
/** Matches `ChecklistItemInput.description`'s server-side bound. */
const ITEM_DESCRIPTION_MAX_LENGTH = 1000;

/** A blank item row. */
const EMPTY_ITEM: ChecklistItemDraft = { label: '', description: '', required: true };

/**
 * Component ChecklistEditForm
 * @class ChecklistEditForm
 *
 * @description
 * Renames a checklist template and revises its item list — added, removed
 * and simply reordered (move up/down) one row at a time, mirroring
 * `ChecklistCreateForm`'s staged-list shape. Seeds its draft from
 * {@link checklist} every time {@link visible} turns true, so a reopened
 * dialog for a different row never resumes the previous one's edits.
 *
 * `items` is always emitted as a full replacement list once at least one row
 * exists, matching `UpdateChecklistInput`'s PATCH semantics on the backend
 * (`ChecklistResource`). Presentational: it validates and emits
 * {@link submitted}; the hosting dialog calls `ChecklistStore.update`
 * (`ARCHITECTURE.md` §10.5).
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-checklist-edit-form
 *   [visible]="editDialogVisible()"
 *   [checklist]="editingChecklist()"
 *   [pending]="store.isUpdating()"
 *   (submitted)="submitEdit($event)"
 *   (cancelled)="editDialogVisible.set(false)"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-checklist-edit-form',
  imports: [RequiredMarker, FormField, HlmButton, HlmCheckbox, HlmInput, ...HlmFieldImports],
  templateUrl: './checklist-edit-form.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChecklistEditForm {
  /**
   * Property error
   * @readonly
   * @description Server or validation error retained beside the current draft.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string | null>}
   */
  public readonly error = input<string | null>(null);
  /**
   * Property creating
   * @readonly
   * @description Whether this editor creates a checklist rather than updating one.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly creating = input(false);
  /**
   * Property dirtyChanged
   * @readonly
   * @description Reports unsaved input to the owning overlay or route guard.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<boolean>}
   */
  public readonly dirtyChanged = output<boolean>();
  /**
   * Property baseline
   * @readonly
   * @description Serialized last accepted draft used to identify unsaved changes.
   * @access private
   * @since 1.0.0
   * @type {WritableSignal<string>}
   */
  private readonly baseline = signal('');
  /**
   * Property draftError
   * @readonly
   * @description Validation feedback for staged checklist items.
   * @access protected
   * @since 1.0.0
   * @type {WritableSignal<string | null>}
   */
  protected readonly draftError = signal<string | null>(null);

  //#region Inputs
  /**
   * Property visible
   * @readonly
   * @description Whether the hosting overlay is open. Watched to reseed the draft from {@link checklist} every time it opens.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly visible: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property checklist
   * @readonly
   * @description The checklist being edited, seeding the draft on every open.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<ChecklistOutput | null>}
   */
  public readonly checklist: InputSignal<ChecklistOutput | null> = input<ChecklistOutput | null>(
    null,
  );

  /**
   * Property pending
   * @readonly
   * @description Whether the update write is in flight, which locks the submit control.
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
   * @description Emits the validated update payload.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<UpdateChecklistInput>}
   */
  public readonly submitted: OutputEmitterRef<UpdateChecklistInput> =
    output<UpdateChecklistInput>();

  /**
   * Property cancelled
   * @readonly
   * @description The operator backed out without saving anything.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<void>}
   */
  public readonly cancelled: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Properties
  /** The checklist name draft. */
  protected readonly model: WritableSignal<{ readonly name: string }> = signal({ name: '' });

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
  /**
   * Property stagedForm
   * @readonly
   * @description Signal Forms validation tree for editable checklist labels.
   * @access protected
   * @since 1.0.0
   * @type {FieldTree<readonly ChecklistItemDraft[]>}
   */
  protected readonly stagedForm = form(this.staged, (path) => {
    applyEach(path, (item) => {
      required(item.label, {
        message: $localize`:@@checklists.form.itemLabelRequired:The item needs a label.`,
      });
      maxLength(item.label, ITEM_LABEL_MAX_LENGTH);
      maxLength(item.description, ITEM_DESCRIPTION_MAX_LENGTH);
    });
  });
  /**
   * Property dirty
   * @readonly
   * @description Whether the current draft differs from its accepted baseline.
   * @access protected
   * @since 1.0.0
   * @type {Signal<boolean>}
   */
  protected readonly dirty = computed(
    () =>
      this.baseline() !== JSON.stringify({ name: this.model().name, items: this.staged() }) ||
      this.itemDraft().label !== '' ||
      this.itemDraft().description !== '',
  );
  //#endregion

  //#region Lifecycle
  /**
   * Method constructor
   * @constructor
   * @description Reseeds the name, staged items and item draft from {@link checklist} every time the hosting overlay opens.
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    effect((): void => {
      if (!this.visible()) return;

      const checklist: ChecklistOutput | null = this.checklist();

      this.model.set({ name: checklist?.name ?? '' });
      this.staged.set(
        (checklist?.items ?? [])
          .toSorted((a, b) => a.position - b.position)
          .map((item) => ({
            label: item.label,
            description: item.description ?? '',
            required: item.required,
          })),
      );
      untracked(() =>
        this.baseline.set(JSON.stringify({ name: this.model().name, items: this.staged() })),
      );
      this.itemDraft.set(EMPTY_ITEM);
      this.itemDraftForm().reset();
    });
    effect(() => this.dirtyChanged.emit(this.dirty()));
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
   * @description Swaps a staged row with its previous or next neighbour.
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

    this.draftError.set(null);
    if (this.itemDraft().label !== '' || this.itemDraft().description !== '') {
      this.itemDraftForm().markAsTouched();
      if (this.itemDraftForm().invalid()) return;
      this.addItem();
    }
    this.stagedForm().markAsTouched();
    if (this.stagedForm().invalid() || this.staged().some((item) => !item.label.trim())) {
      this.draftError.set(
        $localize`:@@checklists.form.invalidItems:Check the labels and descriptions of the checklist items.`,
      );
      return;
    }
    const items: ReadonlyArray<ChecklistItemInput> = this.staged().map(
      (draft: ChecklistItemDraft, position: number): ChecklistItemInput => ({
        label: draft.label.trim(),
        description: draft.description.trim() === '' ? undefined : draft.description.trim(),
        required: draft.required,
        position,
      }),
    );

    this.submitted.emit({ name: this.model().name.trim(), items });
  }
  //#endregion
}
