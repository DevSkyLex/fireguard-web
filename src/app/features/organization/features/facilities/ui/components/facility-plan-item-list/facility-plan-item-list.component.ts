import { FocusKeyManager, type FocusableOption } from '@angular/cdk/a11y';
import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  output,
  signal,
  TemplateRef,
  untracked,
  viewChildren,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCheck } from '@ng-icons/lucide';
import { HlmItemImports } from '@shared/ui/item';
import type { PlanItemListOption } from './models';

/**
 * Component FacilityPlanItemList
 * @class FacilityPlanItemList
 *
 * @description
 * The keyboard-navigable roster behind every plan-registry list in this
 * feature — a floor's rooms in the 3D building view, a floor plan's own
 * zone polygons, and a floor plan's own equipment pins in the 2D Plans tab.
 * All three need exactly the same widget: browse every item and activate
 * one, since their respective canvas/SVG is pointer-reachable but not a
 * natural tab sequence to browse in order.
 *
 * Generalized from a zone-only `FacilityZoneList` once the 2D Plans tab's
 * own hand-rolled equipment roster turned out to duplicate it a second time
 * in the very same panel — `role="listbox"` and `role="option"` on the
 * zone list, a plain `<button>` loop with an invalid `aria-selected` on the
 * equipment one. The rule of three (`ARCHITECTURE.md` §2.9) is satisfied
 * here by locality, not count: the pattern was already duplicated once too
 * many inside a single component.
 *
 * A hand-built `role="listbox"` over a real, focus-moving roving tabindex
 * (`FocusKeyManager` from `@angular/cdk/a11y`) rather than the spartan
 * `command` combobox: `command`'s arrow-key navigation only wires up while
 * its search input holds focus, and its `Enter`-only activation swallows
 * the Space key as a filter character — neither fits a plain browse-and-pick
 * list. Real DOM focus (not `aria-activedescendant`) means the browser's own
 * Enter/Space `<button>` activation needs no extra wiring here.
 *
 * Browsing (arrow keys) and selecting (`Enter`/`Space`, or a click) are
 * deliberately distinct: {@link activeIndex} is a local, transient "which
 * row is focused" position that follows {@link selectedId} whenever it
 * changes from outside (a canvas/SVG tap, or another row's own activation)
 * but otherwise moves freely under arrow-key browsing without touching the
 * actual selection until the user commits. The committed selection alone
 * carries {@link itemActivated}'s emission and the row's `aria-selected`
 * plus a leading check glyph — a redundant, non-chromatic cue standing
 * beside its background tint, matching `PRODUCT.md`'s rule that a state is
 * never colour alone.
 *
 * Each registry's own secondary decorator (a status tag, a status
 * icon+label pair) is content-projected through a single `ng-template`
 * read via {@link decorator} — this widget knows nothing about zones,
 * rooms, or equipment, only that a row has an id, a label, and a source
 * record to hand back to the caller's own markup.
 *
 * Presentational: inputs and outputs only, no store or service
 * (`ARCHITECTURE.md` §10.3).
 *
 * @since 1.13.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-facility-plan-item-list',
  imports: [NgIcon, NgTemplateOutlet, ...HlmItemImports],
  providers: [provideIcons({ lucideCheck })],
  templateUrl: './facility-plan-item-list.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacilityPlanItemList<T> {
  //#region Inputs
  /**
   * Property items
   * @readonly
   * @description The browsable rows, in server order.
   * @access public
   * @since 1.13.0
   * @type {InputSignal<ReadonlyArray<PlanItemListOption<T>>>}
   */
  public readonly items: InputSignal<ReadonlyArray<PlanItemListOption<T>>> =
    input.required<ReadonlyArray<PlanItemListOption<T>>>();

  /**
   * Property selectedId
   * @readonly
   * @description The currently selected row's id, or `null` — matches the wrapping surface's own selection.
   * @access public
   * @since 1.13.0
   * @type {InputSignal<string | null>}
   */
  public readonly selectedId: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property listLabel
   * @readonly
   * @description This list's accessible name (`aria-label`) — the caller's own heading text, so the listbox never carries a second, disconnected translation for the same concept.
   * @access public
   * @since 1.13.0
   * @type {InputSignal<string>}
   */
  public readonly listLabel: InputSignal<string> = input.required<string>();

  /**
   * Property emptyMessage
   * @readonly
   * @description The message shown instead of the listbox when {@link items} is empty — worded by the caller for its own registry ("No zones…", "No equipment…").
   * @access public
   * @since 1.13.0
   * @type {InputSignal<string>}
   */
  public readonly emptyMessage: InputSignal<string> = input.required<string>();

  /**
   * Property testId
   * @readonly
   * @description The listbox root's `data-testid`. Defaults to the original `FacilityZoneList` value so the two zone/room consumers this widget was generalized from need no e2e change; the equipment consumer overrides it.
   * @access public
   * @since 1.13.0
   * @type {InputSignal<string>}
   */
  public readonly testId: InputSignal<string> = input<string>('facility-zone-list');

  /**
   * Property optionTestId
   * @readonly
   * @description Each row's `data-testid`. Same default-preservation rationale as {@link testId}.
   * @access public
   * @since 1.13.0
   * @type {InputSignal<string>}
   */
  public readonly optionTestId: InputSignal<string> = input<string>('facility-zone-list-option');
  //#endregion

  //#region Outputs
  /**
   * Property itemActivated
   * @readonly
   * @description A row was activated by click, `Enter` or `Space` — emits its id.
   * @access public
   * @since 1.13.0
   * @type {OutputEmitterRef<string>}
   */
  public readonly itemActivated: OutputEmitterRef<string> = output<string>();
  //#endregion

  //#region Properties
  /** Injection context carried into the `ListKeyManager`'s signal-backed items. */
  private readonly injector: Injector = inject(Injector);

  /** Every row's own `<button>`, in {@link items} order — the `@for` in the template iterates the same array. */
  private readonly optionRefs: Signal<readonly ElementRef<HTMLButtonElement>[]> =
    viewChildren<ElementRef<HTMLButtonElement>>('itemOption');

  /** {@link optionRefs} wrapped as `FocusableOption`s the key manager can move real DOM focus onto. */
  private readonly focusableOptions: Signal<readonly FocusableOption[]> = computed(() =>
    this.optionRefs().map((ref: ElementRef<HTMLButtonElement>): FocusableOption => ({
      focus: (): void => ref.nativeElement.focus(),
    })),
  );

  /** Drives ArrowUp/Down (wrapping) and Home/End across {@link focusableOptions}. */
  private readonly keyManager: FocusKeyManager<FocusableOption> =
    new FocusKeyManager<FocusableOption>(this.focusableOptions, this.injector)
      .withVerticalOrientation()
      .withWrap()
      .withHomeAndEnd();

  /**
   * Property activeIndex
   * @readonly
   * @description Which row currently carries `tabindex="0"` — the sole entry point into this list's roving tabindex. Re-synced to {@link selectedId} whenever it changes from outside; moved independently by arrow-key browsing in between.
   * @access protected
   * @since 1.13.0
   * @type {WritableSignal<number>}
   */
  protected readonly activeIndex: WritableSignal<number> = signal<number>(0);

  /**
   * Property decorator
   * @readonly
   * @description The caller's own secondary-content `ng-template`, projected beside each row's label with the row's {@link PlanItemListOption.data} as `$implicit`. `undefined` renders nothing extra.
   * @access protected
   * @since 1.13.0
   * @type {Signal<TemplateRef<{ $implicit: T }> | undefined>}
   */
  protected readonly decorator: Signal<TemplateRef<{ $implicit: T }> | undefined> =
    contentChild<TemplateRef<{ $implicit: T }>>(TemplateRef);
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   * @description Keeps {@link activeIndex} pointed at {@link selectedId} whenever it changes from outside, and mirrors the key manager's own browsing position back into it.
   * @access public
   * @since 1.13.0
   */
  public constructor() {
    effect((): void => {
      const items: ReadonlyArray<PlanItemListOption<T>> = this.items();
      const selectedId: string | null = this.selectedId();
      const index: number = items.findIndex((item) => item.id === selectedId);
      const resolved: number = index === -1 ? 0 : index;

      untracked((): void => {
        this.keyManager.updateActiveItem(resolved);
        this.activeIndex.set(resolved);
      });
    });

    this.keyManager.change.subscribe((index: number): void => this.activeIndex.set(index));
  }
  //#endregion

  //#region Methods
  /**
   * Method onKeydown
   * @description Forwards a keydown from any row to the `FocusKeyManager` — arrow keys and Home/End move real focus; every other key passes through untouched.
   * @access protected
   * @since 1.13.0
   * @param {KeyboardEvent} event - The keydown event, bubbled up from a focused row.
   * @returns {void}
   */
  protected onKeydown(event: KeyboardEvent): void {
    this.keyManager.onKeydown(event);
  }

  /**
   * Method activate
   * @description Commits a row as the selection — emits {@link itemActivated} with its id.
   * @access protected
   * @since 1.13.0
   * @param {string} id - The activated row's id.
   * @returns {void}
   */
  protected activate(id: string): void {
    this.itemActivated.emit(id);
  }
  //#endregion
}
