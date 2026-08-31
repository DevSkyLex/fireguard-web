import { FocusKeyManager, type FocusableOption } from '@angular/cdk/a11y';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  output,
  untracked,
  viewChildren,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
  signal,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCheck } from '@ng-icons/lucide';
import type { FacilityPlanOverlayZone } from '@features/organization/features/facilities/models';
import { HlmItemImports } from '@shared/ui/item';
import { FacilityStatusTag } from '../../../facility-status-tag';

/**
 * Component FacilityBuilding3dRoomList
 * @class FacilityBuilding3dRoomList
 *
 * @description
 * The keyboard-navigable roster of one floor's rooms — the accessible
 * equivalent of the 3D canvas's own raycast-and-tap: a canvas is
 * structurally unreachable from a keyboard, so this list has to offer
 * **exactly** what the canvas offers, browse every room and activate one,
 * nothing more and nothing less.
 *
 * A hand-built `role="listbox"` over a real, focus-moving roving tabindex
 * (`FocusKeyManager` from `@angular/cdk/a11y`, the same primitive
 * `CollectionFilterBar` already documents for this exact pattern) rather
 * than the spartan `command` combobox: `command`'s arrow-key navigation
 * only wires up while its search input holds focus, and its `Enter`-only
 * activation swallows the Space key as a filter character — neither fits a
 * plain browse-and-pick list. Real DOM focus (not `aria-activedescendant`)
 * means the browser's own Enter/Space `<button>` activation needs no extra
 * wiring here.
 *
 * Browsing (arrow keys) and selecting (`Enter`/`Space`, or a click) are
 * deliberately distinct: {@link activeIndex} is a local, transient "which
 * row is focused" position that follows {@link selectedRoomId} whenever it
 * changes from outside (a canvas tap, or another row's own activation) but
 * otherwise moves freely under arrow-key browsing without touching the
 * actual selection until the user commits. The committed selection alone
 * carries {@link roomActivated}'s emission and the row's `aria-selected`
 * plus a leading check glyph — a redundant, non-chromatic cue standing
 * beside its background tint, matching `PRODUCT.md`'s rule that a state
 * is never colour alone.
 *
 * Presentational: inputs and outputs only, no store or service
 * (`ARCHITECTURE.md` §10.3).
 *
 * @since 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-facility-building-3d-room-list',
  imports: [NgIcon, FacilityStatusTag, ...HlmItemImports],
  providers: [provideIcons({ lucideCheck })],
  templateUrl: './facility-building-3d-room-list.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacilityBuilding3dRoomList {
  //#region Inputs
  /**
   * Property rooms
   * @readonly
   * @description The selected floor's rooms, in server order.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<ReadonlyArray<FacilityPlanOverlayZone>>}
   */
  public readonly rooms: InputSignal<ReadonlyArray<FacilityPlanOverlayZone>> =
    input.required<ReadonlyArray<FacilityPlanOverlayZone>>();

  /**
   * Property selectedRoomId
   * @readonly
   * @description The currently selected room's facility id, or `null` — matches the 3D scene's own selection.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string | null>}
   */
  public readonly selectedRoomId: InputSignal<string | null> = input<string | null>(null);
  //#endregion

  //#region Outputs
  /**
   * Property roomActivated
   * @readonly
   * @description A row was activated by click, `Enter` or `Space` — emits its facility id, exactly like the scene's own `roomActivated`.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<string>}
   */
  public readonly roomActivated: OutputEmitterRef<string> = output<string>();
  //#endregion

  //#region Properties
  /** Injection context carried into the `ListKeyManager`'s signal-backed items. */
  private readonly injector: Injector = inject(Injector);

  /** Every row's own `<button>`, in {@link rooms} order — the `@for` in the template iterates the same array. */
  private readonly optionRefs: Signal<readonly ElementRef<HTMLButtonElement>[]> =
    viewChildren<ElementRef<HTMLButtonElement>>('roomOption');

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
   * @description Which row currently carries `tabindex="0"` — the sole entry point into this list's roving tabindex. Re-synced to {@link selectedRoomId} whenever it changes from outside; moved independently by arrow-key browsing in between.
   * @access protected
   * @since 1.0.0
   * @type {WritableSignal<number>}
   */
  protected readonly activeIndex: WritableSignal<number> = signal<number>(0);

  /** The list's accessible name. */
  protected readonly listLabel: string = $localize`:@@facility.building3d.roomPanel.roomListLabel:Rooms on this floor`;
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   * @description Keeps {@link activeIndex} pointed at {@link selectedRoomId} whenever it changes from outside, and mirrors the key manager's own browsing position back into it.
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    effect((): void => {
      const rooms: ReadonlyArray<FacilityPlanOverlayZone> = this.rooms();
      const selectedRoomId: string | null = this.selectedRoomId();
      const index: number = rooms.findIndex((room) => room.facilityId === selectedRoomId);
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
   * @since 1.0.0
   * @param {KeyboardEvent} event - The keydown event, bubbled up from a focused row.
   * @returns {void}
   */
  protected onKeydown(event: KeyboardEvent): void {
    this.keyManager.onKeydown(event);
  }

  /**
   * Method activate
   * @description Commits a row as the selection — emits {@link roomActivated} with its facility id.
   * @access protected
   * @since 1.0.0
   * @param {string} facilityId - The activated room's facility id.
   * @returns {void}
   */
  protected activate(facilityId: string): void {
    this.roomActivated.emit(facilityId);
  }
  //#endregion
}
