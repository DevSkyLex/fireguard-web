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
import { FacilityStatusTag } from '../facility-status-tag';

/**
 * Component FacilityZoneList
 * @class FacilityZoneList
 *
 * @description
 * The keyboard-navigable roster of a set of zones — a floor's rooms in the
 * 3D building view, or a floor plan's own zone polygons in the 2D Plans tab.
 * Both surfaces need **exactly** the same thing: browse every zone and
 * activate one, since their respective canvas/SVG is pointer-reachable but
 * not a natural tab sequence to browse in order.
 *
 * Extracted from `facility-building-3d-room-panel`'s private
 * `facility-building-3d-room-list` once the 2D Plans tab needed the same
 * list: the alternative was either a cross-boundary import into another
 * component's private folder (`ARCHITECTURE.md` §13.4, forbidden) or a
 * second, duplicated implementation. The rule of three normally waits for a
 * third consumer, but neither remaining option was acceptable at two, so
 * this is a deliberate early extraction — see `FEATURE.md`.
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
 * row is focused" position that follows {@link selectedZoneId} whenever it
 * changes from outside (a canvas/SVG tap, or another row's own activation)
 * but otherwise moves freely under arrow-key browsing without touching the
 * actual selection until the user commits. The committed selection alone
 * carries {@link zoneActivated}'s emission and the row's `aria-selected`
 * plus a leading check glyph — a redundant, non-chromatic cue standing
 * beside its background tint, matching `PRODUCT.md`'s rule that a state is
 * never colour alone.
 *
 * Presentational: inputs and outputs only, no store or service
 * (`ARCHITECTURE.md` §10.3).
 *
 * @since 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-facility-zone-list',
  imports: [NgIcon, FacilityStatusTag, ...HlmItemImports],
  providers: [provideIcons({ lucideCheck })],
  templateUrl: './facility-zone-list.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacilityZoneList {
  //#region Inputs
  /**
   * Property zones
   * @readonly
   * @description The browsable zones, in server order.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<ReadonlyArray<FacilityPlanOverlayZone>>}
   */
  public readonly zones: InputSignal<ReadonlyArray<FacilityPlanOverlayZone>> =
    input.required<ReadonlyArray<FacilityPlanOverlayZone>>();

  /**
   * Property selectedZoneId
   * @readonly
   * @description The currently selected zone's facility id, or `null` — matches the wrapping surface's own selection.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string | null>}
   */
  public readonly selectedZoneId: InputSignal<string | null> = input<string | null>(null);
  //#endregion

  //#region Outputs
  /**
   * Property zoneActivated
   * @readonly
   * @description A row was activated by click, `Enter` or `Space` — emits its facility id.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<string>}
   */
  public readonly zoneActivated: OutputEmitterRef<string> = output<string>();
  //#endregion

  //#region Properties
  /** Injection context carried into the `ListKeyManager`'s signal-backed items. */
  private readonly injector: Injector = inject(Injector);

  /** Every row's own `<button>`, in {@link zones} order — the `@for` in the template iterates the same array. */
  private readonly optionRefs: Signal<readonly ElementRef<HTMLButtonElement>[]> =
    viewChildren<ElementRef<HTMLButtonElement>>('zoneOption');

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
   * @description Which row currently carries `tabindex="0"` — the sole entry point into this list's roving tabindex. Re-synced to {@link selectedZoneId} whenever it changes from outside; moved independently by arrow-key browsing in between.
   * @access protected
   * @since 1.0.0
   * @type {WritableSignal<number>}
   */
  protected readonly activeIndex: WritableSignal<number> = signal<number>(0);

  /** The list's accessible name. */
  protected readonly listLabel: string = $localize`:@@facility.zoneList.label:Zones`;
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   * @description Keeps {@link activeIndex} pointed at {@link selectedZoneId} whenever it changes from outside, and mirrors the key manager's own browsing position back into it.
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    effect((): void => {
      const zones: ReadonlyArray<FacilityPlanOverlayZone> = this.zones();
      const selectedZoneId: string | null = this.selectedZoneId();
      const index: number = zones.findIndex((zone) => zone.facilityId === selectedZoneId);
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
   * @description Commits a row as the selection — emits {@link zoneActivated} with its facility id.
   * @access protected
   * @since 1.0.0
   * @param {string} facilityId - The activated zone's facility id.
   * @returns {void}
   */
  protected activate(facilityId: string): void {
    this.zoneActivated.emit(facilityId);
  }
  //#endregion
}
