import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideTag, lucideX } from '@ng-icons/lucide';
import type { EquipmentTagOutput } from '@features/organization/features/equipments/models';
import { EmptyState } from '@shared/empty-state';
import { HlmBadgeImports } from '@shared/ui/badge';
import { HlmButton } from '@shared/ui/button';
import { HlmComboboxImports } from '@shared/ui/combobox';
import { HlmSpinnerImports } from '@shared/ui/spinner';

/** The value standing in for "no catalog item picked" in the combobox — a tag id is never an empty string. */
const NO_PICK_VALUE = '';

/**
 * Component EquipmentTags
 * @class EquipmentTags
 *
 * @description
 * The equipment's labeling tags (`EquipmentTagOutput`, distinct from the
 * lifecycle `equipment-status-tag` registry): the current tags as removable
 * chips, plus an `hlm-combobox` offering the organization's tag catalog and
 * a "Create" option for a name that matches nothing in it — `AddTagInput`
 * create-or-attaches by name server-side, so both paths emit the same
 * {@link tagAddRequested}. Mirrors `FacilityMoveDialog`'s combobox pattern.
 * Purely presentational (`ARCHITECTURE.md` §10.3): it owns no store and
 * calls no service; the page owns the load and the write.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-equipment-tags
 *   [tags]="equipment().tags"
 *   [catalog]="store.tags()"
 *   [editable]="canWrite()"
 *   [addPending]="store.addTagCallState().status === 'pending'"
 *   [removePendingIds]="pendingTagRemoveIds()"
 *   (tagAddRequested)="onTagAddRequested($event)"
 *   (tagRemoveRequested)="onTagRemoveRequested($event)"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-equipment-tags',
  imports: [
    NgIcon,
    HlmButton,
    EmptyState,
    ...HlmBadgeImports,
    ...HlmComboboxImports,
    ...HlmSpinnerImports,
  ],
  providers: [provideIcons({ lucideTag, lucideX })],
  templateUrl: './equipment-tags.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EquipmentTags {
  //#region Inputs
  /**
   * Property tags
   * @readonly
   * @description The equipment's currently attached tags.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly EquipmentTagOutput[]>}
   */
  public readonly tags: InputSignal<readonly EquipmentTagOutput[]> = input<
    readonly EquipmentTagOutput[]
  >([]);

  /**
   * Property catalog
   * @readonly
   * @description The organization's tag catalog offered by the combobox.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly EquipmentTagOutput[]>}
   */
  public readonly catalog: InputSignal<readonly EquipmentTagOutput[]> = input<
    readonly EquipmentTagOutput[]
  >([]);

  /**
   * Property editable
   * @readonly
   * @description Whether the member may add or remove a tag.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly editable: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property loadingCatalog
   * @readonly
   * @description Whether the tag catalog is still loading.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly loadingCatalog: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property addPending
   * @readonly
   * @description Whether an add write is in flight, which locks the combobox.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly addPending: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property removePendingIds
   * @readonly
   * @description Ids of the tags whose removal is in flight, so each chip locks on its own write.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<ReadonlySet<string>>}
   */
  public readonly removePendingIds: InputSignal<ReadonlySet<string>> = input<ReadonlySet<string>>(
    new Set<string>(),
  );
  //#endregion

  //#region Outputs
  /**
   * Property tagAddRequested
   * @readonly
   * @description The name to attach — an existing catalog pick or a freshly typed one; the page calls `addTag`.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<string>}
   */
  public readonly tagAddRequested: OutputEmitterRef<string> = output<string>();

  /**
   * Property tagRemoveRequested
   * @readonly
   * @description The chip's tag to detach; the page calls `removeTag`.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<EquipmentTagOutput>}
   */
  public readonly tagRemoveRequested: OutputEmitterRef<EquipmentTagOutput> =
    output<EquipmentTagOutput>();
  //#endregion

  //#region Properties
  /** The combobox's typed search text. */
  protected readonly searchText: WritableSignal<string> = signal<string>('');

  /** The combobox's own transient selection, reset to {@link NO_PICK_VALUE} after each pick. */
  protected readonly pickedValue: WritableSignal<string> = signal<string>(NO_PICK_VALUE);

  /** {@link catalog}, with the equipment's already-attached tags removed. */
  protected readonly availableCatalog: Signal<readonly EquipmentTagOutput[]> = computed(() => {
    const attachedIds: ReadonlySet<string> = new Set(this.tags().map((tag) => tag.id));

    return this.catalog().filter((tag) => !attachedIds.has(tag.id));
  });

  /** Names a picked catalog tag on the combobox trigger. */
  protected readonly tagLabelOf: (value: string) => string = (value: string): string =>
    this.availableCatalog().find((tag) => tag.id === value)?.name ?? '';

  /** Whether the typed search matches no catalog tag, so a "Create" option applies. */
  protected readonly canCreateFromSearch: Signal<boolean> = computed<boolean>(() => {
    const typed: string = this.searchText().trim();

    return typed.length > 0 && !this.availableCatalog().some((tag) => tag.name === typed);
  });

  /** The "Create …" option's label, naming the exact text that will be attached. */
  protected readonly createLabel: Signal<string> = computed<string>(() => {
    const typed: string = this.searchText().trim();

    return $localize`:@@equipment.tags.create:Create "${typed}:name:"`;
  });
  //#endregion

  //#region Methods
  /**
   * Method onPicked
   * @description Emits {@link tagAddRequested} for a catalog pick, then resets the combobox.
   * @access protected
   * @since 1.0.0
   * @param {string} value - The picked catalog tag's id.
   * @returns {void}
   */
  protected onPicked(value: string): void {
    if (value === NO_PICK_VALUE) return;

    const picked: EquipmentTagOutput | undefined = this.availableCatalog().find(
      (tag) => tag.id === value,
    );
    if (!picked) return;

    this.tagAddRequested.emit(picked.name);
    this.pickedValue.set(NO_PICK_VALUE);
    this.searchText.set('');
  }

  /**
   * Method createFromSearch
   * @description Emits {@link tagAddRequested} for the typed search text, then resets the combobox.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected createFromSearch(): void {
    const typed: string = this.searchText().trim();
    if (!typed) return;

    this.tagAddRequested.emit(typed);
    this.pickedValue.set(NO_PICK_VALUE);
    this.searchText.set('');
  }

  /**
   * Method isRemoving
   * @description Whether this chip's own removal is in flight.
   * @access protected
   * @since 1.0.0
   * @param {EquipmentTagOutput} tag - The chip's tag.
   * @returns {boolean} True while the row's write is pending.
   */
  protected isRemoving(tag: EquipmentTagOutput): boolean {
    return this.removePendingIds().has(tag.id);
  }

  /**
   * Method removeAriaLabelOf
   * @description The chip's remove button accessible name, naming the tag it detaches.
   * @access protected
   * @since 1.0.0
   * @param {EquipmentTagOutput} tag - The chip's tag.
   * @returns {string} A localized accessible name.
   */
  protected removeAriaLabelOf(tag: EquipmentTagOutput): string {
    return $localize`:@@equipment.tags.removeAria:Remove tag ${tag.name}:name:`;
  }
  //#endregion
}
