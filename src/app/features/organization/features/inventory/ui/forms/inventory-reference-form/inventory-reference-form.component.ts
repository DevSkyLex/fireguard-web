import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { disabled, form, FormField, maxLength, validate } from '@angular/forms/signals';
import type {
  InventoryPartOutput,
  InventoryWarehouseOutput,
  CreateInventoryPartInput,
  CreateInventoryWarehouseInput,
} from '@features/organization/features/inventory/models';
import { HlmAlertImports } from '@shared/ui/alert';
import { HlmButton } from '@shared/ui/button';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmInput } from '@shared/ui/input';
import { HlmSpinner } from '@shared/ui/spinner';
import { HlmToggleGroupImports } from '@shared/ui/toggle-group';

/**
 * Type InventoryReferenceSubmission
 *
 * @description
 * Validated mutable description with permanent creation code and category.
 *
 * @type InventoryReferenceSubmission
 */
export type InventoryReferenceSubmission = CreateInventoryPartInput | CreateInventoryWarehouseInput;

/**
 * Class InventoryReferenceForm
 *
 * @description
 * Native Signal Form creates references and retains unsuccessful edit drafts.
 */
@Component({
  selector: 'app-inventory-reference-form',
  templateUrl: './inventory-reference-form.component.html',
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
export class InventoryReferenceForm {
  /**
   * Property kind
   * @readonly
   *
   * @description
   * Whether this editor describes a part or a warehouse.
   *
   * @access public
   * @since unreleased
   *
   * @type {import('@angular/core').InputSignal<'part' | 'warehouse'>}
   */
  public readonly kind = input.required<'part' | 'warehouse'>();
  /**
   * Property entry
   * @readonly
   *
   * @description
   * Existing retained reference or fresh creation.
   *
   * @access public
   * @since unreleased
   *
   * @type {import('@angular/core').InputSignal<
   *   InventoryPartOutput | InventoryWarehouseOutput | null
   * >}
   */
  public readonly entry = input<InventoryPartOutput | InventoryWarehouseOutput | null>(null);
  /**
   * Property pending
   * @readonly
   *
   * @description
   * Accepted command prevents changes and duplicate submit.
   *
   * @access public
   * @since unreleased
   *
   * @type {import('@angular/core').InputSignal<boolean>}
   */
  public readonly pending = input(false);
  /**
   * Property available
   * @readonly
   *
   * @description
   * Authorization and connectivity supplied by page.
   *
   * @access public
   * @since unreleased
   *
   * @type {import('@angular/core').InputSignal<boolean>}
   */
  public readonly available = input(true);
  /**
   * Property error
   * @readonly
   *
   * @description
   * Rejected command message, preserving the entered draft.
   *
   * @access public
   * @since unreleased
   *
   * @type {import('@angular/core').InputSignal<string | null>}
   */
  public readonly error = input<string | null>(null);
  /**
   * Property submitted
   * @readonly
   *
   * @description
   * Validated transport fields emitted without network calls.
   *
   * @access public
   * @since unreleased
   *
   * @type {import('@angular/core').OutputEmitterRef<InventoryReferenceSubmission>}
   */
  public readonly submitted = output<InventoryReferenceSubmission>();
  /**
   * Property cancelled
   * @readonly
   *
   * @description
   * Parent decides draft dismissal.
   *
   * @access public
   * @since unreleased
   *
   * @type {import('@angular/core').OutputEmitterRef<void>}
   */
  public readonly cancelled = output<void>();
  /**
   * Property dirtyChanged
   * @readonly
   *
   * @description
   * Actual native dirty state protects navigation.
   *
   * @access public
   * @since unreleased
   *
   * @type {import('@angular/core').OutputEmitterRef<boolean>}
   */
  public readonly dirtyChanged = output<boolean>();
  /**
   * Property draft
   * @readonly
   *
   * @description
   * Unified local draft only, without invented API concurrency tokens.
   *
   * @access protected
   * @since unreleased
   *
   * @type {import('@angular/core').WritableSignal<{
   *   code: string;
   *   label: string;
   *   unit: string;
   *   kind: 'part' | 'consumable';
   * }>}
   */
  protected readonly draft = signal({
    code: '',
    label: '',
    unit: 'piece',
    kind: 'part' as 'part' | 'consumable',
  });
  /**
   * Property identity
   * @readonly
   *
   * @description
   * Stable editor identity avoids resetting the draft after a rejected save.
   *
   * @access private
   * @since unreleased
   *
   * @type {import('@angular/core').Signal<string>}
   */
  private readonly identity = computed(() => this.kind() + ':' + (this.entry()?.id ?? 'new'));
  /**
   * Property fields
   * @readonly
   *
   * @description
   * Server-aligned required fields and immutable identity.
   *
   * @access protected
   * @since unreleased
   *
   * @type {import('@angular/forms/signals').FieldTree<
   *   { code: string; label: string; unit: string; kind: 'part' | 'consumable' },
   *   string | number,
   *   'writable'
   * >}
   */
  protected readonly fields = form(this.draft, (path) => {
    disabled(path, () => this.pending() || !this.available());
    disabled(path.code, () => !!this.entry());
    disabled(path.kind, () => !!this.entry() || this.kind() === 'warehouse');
    validate(path.code, ({ value }) =>
      value().trim()
        ? null
        : {
            kind: 'required',
            message: $localize`:@@inventory.form.codeRequired:Enter a permanent code.`,
          },
    );
    validate(path.label, ({ value }) =>
      value().trim()
        ? null
        : { kind: 'required', message: $localize`:@@inventory.form.nameRequired:Enter a name.` },
    );
    validate(path.unit, ({ value }) =>
      this.kind() === 'warehouse' || value().trim()
        ? null
        : {
            kind: 'required',
            message: $localize`:@@inventory.form.unitRequired:Enter a stock unit.`,
          },
    );
    maxLength(path.code, 100);
    maxLength(path.label, 255);
    maxLength(path.unit, 32);
  });
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Seeds each identity once; request failures never clear entered fields.
   *
   * @access public
   * @since unreleased
   */
  public constructor() {
    effect(() => {
      this.identity();
      untracked(() => {
        const entry = this.entry();
        this.fields().reset({
          code: entry?.code ?? '',
          label: entry ? ('label' in entry ? entry.label : entry.name) : '',
          unit: entry && 'unit' in entry ? entry.unit : 'piece',
          kind: entry && 'kind' in entry ? entry.kind : 'part',
        });
      });
    });
    effect(() => {
      const dirty = this.fields().dirty();
      untracked(() => this.dirtyChanged.emit(dirty));
    });
  }
  /**
   * Method categoryChanged
   *
   * @description
   * Connects the native two-option category to its Signal Form.
   *
   * @access protected
   * @since unreleased
   *
   * @param {unknown} kind - Native category selection.
   *
   * @returns {void}
   */
  protected categoryChanged(kind: unknown): void {
    if (
      this.entry() ||
      this.pending() ||
      !this.available() ||
      (kind !== 'part' && kind !== 'consumable')
    )
      return;
    this.draft.update((draft) => ({ ...draft, kind }));
    this.fields.kind().markAsDirty();
  }
  /**
   * Method submit
   *
   * @description
   * Emits valid fields with immutable code and category on edits.
   *
   * @access protected
   * @since unreleased
   *
   * @param {Event} event - Native submit event.
   *
   * @returns {void}
   */
  protected submit(event: Event): void {
    event.preventDefault();
    this.fields().markAsTouched();
    if (this.pending() || !this.available() || this.fields().invalid()) return;
    const draft = this.draft(),
      entry = this.entry();
    const code = entry?.code ?? draft.code.trim();
    if (this.kind() === 'warehouse') this.submitted.emit({ code, name: draft.label.trim() });
    else
      this.submitted.emit({
        code,
        label: draft.label.trim(),
        unit: draft.unit.trim(),
        kind: entry && 'kind' in entry ? entry.kind : draft.kind,
      });
  }
}
