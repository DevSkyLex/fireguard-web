import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  input,
  output,
  viewChild,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideMap, lucideX } from '@ng-icons/lucide';
import type { BrnDialogState } from '@spartan-ng/brain/dialog';
import type {
  FacilityBuildingModelFloor,
  FacilityPlanOverlayZone,
  FacilityType,
} from '@features/organization/features/facilities/models';
import { FACILITY_TYPE_OPTIONS } from '@features/organization/features/facilities/options';
import { isCompact } from '@shared/breakpoint';
import { HlmButton } from '@shared/ui/button';
import { HlmCardImports } from '@shared/ui/card';
import { HlmSheetImports } from '@shared/ui/sheet';
import { FacilityStatusTag } from '../facility-status-tag';
import { FacilityZoneList } from '../facility-zone-list';

/**
 * Component FacilityBuilding3dRoomPanel
 * @class FacilityBuilding3dRoomPanel
 *
 * @description
 * The 3D building view's keyboard-reachable browsing surface. Mounted by
 * the owning page as soon as a floor is selected — never gated on a room,
 * which would leave a keyboard/screen-reader user with no entry path at
 * all, since a room can only be selected today through the canvas' own
 * pointer-only `roomActivated` (`FacilityBuilding3dPage` selects the
 * model's first floor by default on load precisely so this panel — and
 * therefore `app-facility-building-3d-room-list` — is always reachable,
 * with no prior pointer interaction required).
 *
 * Always renders: a floor selector (`role="group"`, one button per
 * {@link floors}, `aria-current` on {@link selectedFloorId}) and
 * `app-facility-zone-list` for that floor's rooms — the actual accessible
 * equivalent of the canvas' pointer browsing. `FacilityZoneList` was
 * extracted from this component's own former private `facility-building-3d-room-list`
 * once the 2D Plans tab's own panel needed the identical list over the same
 * `FacilityPlanOverlayZone` type — see its own `@description` and this
 * feature's `FEATURE.md`. The room *detail*
 * block (name, type, status through the feature's own `facility-status-tag`
 * registry, a "View on 2D plan" action, and its own close control) renders
 * only once {@link room} is non-`null`; closing it deselects the room
 * ({@link roomClosed}) without touching the floor selection, so this
 * surface itself never disappears.
 *
 * Renders as an `hlm-card` at and above `sm`, an `hlm-sheet` (bottom side,
 * `disableClose`) beneath it, switching on `@shared/breakpoint`'s own
 * `isCompact`. `disableClose` keeps the sheet from being dismissed by
 * `Escape`, a backdrop click or a swipe: were it closable, dismissing it
 * would remove this feature's only keyboard-reachable surface with no way
 * back except a pointer tap on the canvas — exactly the trap this
 * component exists to avoid. Presentational (`ARCHITECTURE.md` §10.3): the
 * page owns the store call every output here triggers, and owns moving
 * focus into and out of the room-detail block — {@link focus} only exposes
 * the DOM target for that, it decides nothing about when.
 *
 * @since 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-facility-building-3d-room-panel',
  imports: [
    NgTemplateOutlet,
    NgIcon,
    FacilityStatusTag,
    FacilityZoneList,
    HlmButton,
    ...HlmCardImports,
    ...HlmSheetImports,
  ],
  providers: [provideIcons({ lucideMap, lucideX })],
  templateUrl: './facility-building-3d-room-panel.component.html',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacilityBuilding3dRoomPanel {
  //#region Inputs
  /**
   * Property floors
   * @readonly
   * @description Every floor of the building, in server order — the floor selector's own catalog.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<ReadonlyArray<FacilityBuildingModelFloor>>}
   */
  public readonly floors: InputSignal<ReadonlyArray<FacilityBuildingModelFloor>> =
    input.required<ReadonlyArray<FacilityBuildingModelFloor>>();

  /**
   * Property selectedFloorId
   * @readonly
   * @description The currently selected floor's facility id — always set while this panel is mounted.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string>}
   */
  public readonly selectedFloorId: InputSignal<string> = input.required<string>();

  /**
   * Property room
   * @readonly
   * @description The selected room, or `null` while only a floor is selected — gates the detail block.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<FacilityPlanOverlayZone | null>}
   */
  public readonly room: InputSignal<FacilityPlanOverlayZone | null> =
    input<FacilityPlanOverlayZone | null>(null);
  /**
   * Property compactVisible
   * @readonly
   * @description
   * Whether the compact-viewport sheet is open. Ignored on a wide viewport,
   * where the panel is a card that is simply always there.
   *
   * The page owns this rather than the panel, because the toolbar control that
   * reopens a dismissed sheet lives there — and because a sheet that cannot be
   * dismissed would cover most of a small screen with no way back to the very
   * building it describes.
   *
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly compactVisible: InputSignal<boolean> = input<boolean>(true);
  //#endregion

  //#region Outputs
  /**
   * Property floorActivated
   * @readonly
   * @description A different floor was picked from the floor selector.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<string>}
   */
  public readonly floorActivated: OutputEmitterRef<string> = output<string>();

  /**
   * Property roomActivated
   * @readonly
   * @description A room was picked from the room list — forwarded verbatim, the page resolves it the same way as the scene's own `roomActivated`.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<string>}
   */
  public readonly roomActivated: OutputEmitterRef<string> = output<string>();

  /**
   * Property roomClosed
   * @readonly
   * @description The room detail block's own close control was activated — the page deselects the room, leaving the floor selection (and this panel) untouched.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<void>}
   */
  public readonly roomClosed: OutputEmitterRef<void> = output<void>();

  /**
   * Property plan2dRequested
   * @readonly
   * @description "View on 2D plan" was activated.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<void>}
   */
  public readonly plan2dRequested: OutputEmitterRef<void> = output<void>();

  /**
   * Property compactDismissed
   * @readonly
   * @description The compact sheet was dismissed — by its backdrop, by Escape, or by a swipe. The page owns the flag and reopens it from the toolbar.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<void>}
   */
  public readonly compactDismissed: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Properties
  /** Whether the viewport is narrow enough to render the `hlm-sheet` branch instead of the `hlm-card` one. */
  protected readonly isCompact: Signal<boolean> = isCompact();

  /** The sheet's own open/closed state, derived from {@link compactVisible}. */
  protected readonly sheetState: Signal<BrnDialogState> = computed<BrnDialogState>(() =>
    this.compactVisible() ? 'open' : 'closed',
  );

  /** {@link selectedFloorId} resolved against {@link floors} — `null` only if the id matches nothing, which never happens in practice. */
  protected readonly selectedFloor: Signal<FacilityBuildingModelFloor | null> =
    computed<FacilityBuildingModelFloor | null>(
      () => this.floors().find((floor) => floor.facilityId === this.selectedFloorId()) ?? null,
    );

  /** The selected floor's rooms — the room list's own input. */
  protected readonly floorRooms: Signal<ReadonlyArray<FacilityPlanOverlayZone>> = computed<
    ReadonlyArray<FacilityPlanOverlayZone>
  >(() => this.selectedFloor()?.rooms ?? []);

  /** The rendered room-detail close button — {@link focus}'s target, present only once {@link room} is non-`null`. */
  private readonly closeButtonRef: Signal<ElementRef<HTMLButtonElement> | undefined> =
    viewChild<ElementRef<HTMLButtonElement>>('closeButton');

  /** This panel's accessible landmark name, shared by the card and the sheet content. */
  protected readonly panelLabel: string = $localize`:@@facility.building3d.roomPanel.title:Building rooms`;

  /** The floor selector's accessible name. */
  protected readonly floorSelectorLabel: string = $localize`:@@facility.building3d.roomPanel.floorSelectorLabel:Floors`;

  /** The room-detail close button's accessible name. */
  protected readonly closeLabel: string = $localize`:@@facility.building3d.roomPanel.close:Close`;

  /** The "View on 2D plan" action's label. */
  protected readonly plan2dLabel: string = $localize`:@@facility.building3d.roomPanel.plan2dAction:View on 2D plan`;
  //#endregion

  //#region Methods
  /**
   * Method typeLabel
   * @description Resolves a room's raw {@link FacilityType} into its localized label, from the same catalog the create form's type picker already draws from — never a second lookup table for the same closed set.
   * @access protected
   * @since 1.0.0
   * @param {FacilityType} type - The room's facility type.
   * @returns {string} Its localized label, or the raw value when it matches no known type.
   */
  protected typeLabel(type: FacilityType): string {
    return FACILITY_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? type;
  }

  /**
   * Method focus
   * @description Moves real DOM focus onto the room-detail block's own close button. A no-op while no room is selected — the page only calls this on the room-selection opening edge, when that button is guaranteed to have just rendered.
   * @access public
   * @since 1.0.0
   * @returns {void}
   */
  public focus(): void {
    this.closeButtonRef()?.nativeElement.focus();
  }
  //#endregion

  /**
   * Method onSheetStateChanged
   * @method onSheetStateChanged
   *
   * @description
   * Reports a dismissal back to the page, which owns the flag this state is
   * derived from. Guarded against echoing a state the page already holds.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {BrnDialogState} state - The overlay's new state.
   *
   * @returns {void}
   */
  protected onSheetStateChanged(state: BrnDialogState): void {
    if (state === 'open' || !this.compactVisible()) return;

    this.compactDismissed.emit();
  }
}
