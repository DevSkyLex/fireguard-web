import {
  ChangeDetectionStrategy,
  Component,
  inject,
  computed,
  input,
  output,
  signal,
  viewChild,
  type ElementRef,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideBox, lucideBoxes, lucideList, lucideMapPin } from '@ng-icons/lucide';
import { INTERACTION_CAPABILITIES_PORT } from '@core/interaction-capabilities';
import type { EquipmentOutput } from '@features/organization/features/equipments/models';
import type { FacilityOutput } from '@features/organization/features/facilities/models';
import type { FacilityPlanEditMode } from '@features/organization/features/facilities/state';
import { HlmButton } from '@shared/ui/button';
import { HlmDrawerImports } from '@shared/ui/drawer';
import { HlmInput } from '@shared/ui/input';
import { HlmItem, HlmItemContent, HlmItemGroup, HlmItemMedia, HlmItemTitle } from '@shared/ui/item';
import { HlmSelectImports } from '@shared/ui/select';
import { HlmSpinnerImports } from '@shared/ui/spinner';
import { HlmSwitch } from '@shared/ui/switch';
import { equipmentPlanLabel } from '../../../utils';

/**
 * Component FacilityPlanToolbar
 * @class FacilityPlanToolbar
 *
 * @description
 * The Plans tab's single toolbar, grouping what used to be spread across
 * three stacked blocks — an isolated "3D view" link, the zone/equipment
 * layer switches, and the editor picker/status bar — into one bar, laid out
 * like `FacilityBuilding3dPage`'s own toolbar: one `flex-wrap` group on the
 * left (layer switches, the mobile panel opener), one on the right (the 3D
 * link, the `draw-zone`/`place-pin` pickers and their in-mode controls).
 * Candidate catalogs may contain hundreds of records, so those two pickers
 * remain Spartan selects on desktop and become searchable Spartan bottom
 * drawers in the mobile interaction mode.
 * Presentational: inputs and outputs only, no store or service
 * (`ARCHITECTURE.md` §10.3). The page owns every store write a control here
 * triggers, including the pickers' `null`-clearing selection events — this
 * component only forwards a genuinely picked id.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-facility-plan-toolbar',
  imports: [
    RouterLink,
    NgIcon,
    HlmButton,
    HlmInput,
    HlmItem,
    HlmItemContent,
    HlmItemGroup,
    HlmItemMedia,
    HlmItemTitle,
    HlmSwitch,
    ...HlmDrawerImports,
    ...HlmSelectImports,
    ...HlmSpinnerImports,
  ],
  providers: [provideIcons({ lucideBox, lucideBoxes, lucideList, lucideMapPin })],
  templateUrl: './facility-plan-toolbar.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacilityPlanToolbar {
  //#region Inputs
  /**
   * Property is3dLinkVisible
   * @readonly
   *
   * @description
   * Whether the facility is a `building` — the "3D view" link only ever makes sense there.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly is3dLinkVisible: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property plan3dRoute
   * @readonly
   *
   * @description
   * Where the "3D view" link points.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<ReadonlyArray<string>>}
   */
  public readonly plan3dRoute: InputSignal<ReadonlyArray<string>> = input<ReadonlyArray<string>>(
    [],
  );

  /**
   * Property showZones
   * @readonly
   *
   * @description
   * Whether the overlay's zone-polygon layer is shown.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly showZones: InputSignal<boolean> = input<boolean>(true);

  /**
   * Property showEquipment
   * @readonly
   *
   * @description
   * Whether the overlay's equipment-pin layer is shown.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly showEquipment: InputSignal<boolean> = input<boolean>(true);

  /**
   * Property overlayHasContent
   * @readonly
   *
   * @description
   * Whether the loaded overlay carries at least one zone or pin — gates the layer switches.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly overlayHasContent: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property panelOpenerVisible
   * @readonly
   *
   * @description
   * Whether the mobile-mode panel opener renders — mirrors `FacilityBuilding3dPage`'s own toolbar
   * button.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly panelOpenerVisible: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property canWrite
   * @readonly
   *
   * @description
   * Whether the member may draw/clear a zone outline.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly canWrite: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property canEditEquipment
   * @readonly
   *
   * @description
   * Whether the member may place, move, or remove an equipment pin.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly canEditEquipment: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property editMode
   * @readonly
   *
   * @description
   * The editor's current pointer-editing mode.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<FacilityPlanEditMode>}
   */
  public readonly editMode: InputSignal<FacilityPlanEditMode> = input<FacilityPlanEditMode>('none');

  /**
   * Property zoneCandidates
   * @readonly
   *
   * @description
   * The `draw-zone` picker's option list — zones/areas not yet drawn on this plan.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<ReadonlyArray<FacilityOutput>>}
   */
  public readonly zoneCandidates: InputSignal<ReadonlyArray<FacilityOutput>> = input<
    ReadonlyArray<FacilityOutput>
  >([]);

  /**
   * Property equipmentCandidates
   * @readonly
   *
   * @description
   * The `place-pin` picker's option list — equipment not yet pinned on this plan.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<ReadonlyArray<EquipmentOutput>>}
   */
  public readonly equipmentCandidates: InputSignal<ReadonlyArray<EquipmentOutput>> = input<
    ReadonlyArray<EquipmentOutput>
  >([]);

  /**
   * Property zoneCandidatesLoading
   * @readonly
   *
   * @description
   * Whether the zone candidate request is in flight.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly zoneCandidatesLoading: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property zoneCandidatesFailed
   * @readonly
   *
   * @description
   * Whether the last zone candidate request failed.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly zoneCandidatesFailed: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property equipmentCandidatesLoading
   * @readonly
   *
   * @description
   * Whether the equipment candidate request is in flight.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly equipmentCandidatesLoading: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property equipmentCandidatesFailed
   * @readonly
   *
   * @description
   * Whether the last equipment candidate request failed.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly equipmentCandidatesFailed: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property draftPointCount
   * @readonly
   *
   * @description
   * The in-progress `draw-zone` outline's vertex count — disables "Undo"/"Close polygon" below the
   * minimum.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<number>}
   */
  public readonly draftPointCount: InputSignal<number> = input<number>(0);

  /**
   * Property isSavingZoneGeometry
   * @readonly
   *
   * @description
   * Whether a zone outline write is in flight — disables "Close polygon" for its duration.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly isSavingZoneGeometry: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property statusLabel
   * @readonly
   *
   * @description
   * The active mode's status line, e.g. the vertex count while drawing — computed by the page from
   * store data.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string>}
   */
  public readonly statusLabel: InputSignal<string> = input<string>('');
  //#endregion

  /**
   * Property canTraceFloor
   * @readonly
   *
   * @description
   * Floor outline editing is available for a floor's own selected plan.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly canTraceFloor: InputSignal<boolean> = input(false);

  /**
   * Property canCalibrate
   * @readonly
   *
   * @description
   * Whether plan image dimensions permit calibration.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly canCalibrate: InputSignal<boolean> = input(false);

  /**
   * Property zoneCandidatePage
   * @readonly
   *
   * @description
   * Current server page for candidate facilities.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<number>}
   */
  public readonly zoneCandidatePage: InputSignal<number> = input(1);

  /**
   * Property zoneCandidateTotal
   * @readonly
   *
   * @description
   * Total matching descendant facility records.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<number>}
   */
  public readonly zoneCandidateTotal: InputSignal<number> = input(0);

  /**
   * Property equipmentCandidatePage
   * @readonly
   *
   * @description
   * Current server page for candidate equipment.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<number>}
   */
  public readonly equipmentCandidatePage: InputSignal<number> = input(1);

  /**
   * Property equipmentCandidateTotal
   * @readonly
   *
   * @description
   * Total matching descendant equipment records.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<number>}
   */
  public readonly equipmentCandidateTotal: InputSignal<number> = input(0);

  /**
   * Property zoneCandidatePageCount
   * @readonly
   *
   * @description
   * Number of server pages for the descendant facility results.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<number>}
   */
  protected readonly zoneCandidatePageCount: Signal<number> = computed(() =>
    Math.max(1, Math.ceil(this.zoneCandidateTotal() / 100)),
  );

  /**
   * Property equipmentCandidatePageCount
   * @readonly
   *
   * @description
   * Number of server pages for the descendant equipment results.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<number>}
   */
  protected readonly equipmentCandidatePageCount: Signal<number> = computed(() =>
    Math.max(1, Math.ceil(this.equipmentCandidateTotal() / 100)),
  );

  //#region Outputs

  /**
   * Property floorOutlineRequested
   * @readonly
   *
   * @description
   * Requests drawing the owning floor's footprint.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly floorOutlineRequested: OutputEmitterRef<void> = output<void>();

  /**
   * Property calibrationRequested
   * @readonly
   *
   * @description
   * Requests a two-point measurement on the displayed image.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly calibrationRequested: OutputEmitterRef<void> = output<void>();

  /**
   * Property calibrationCoordinatesRequested
   * @readonly
   *
   * @description
   * Opens the keyboard calibration form.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly calibrationCoordinatesRequested: OutputEmitterRef<void> = output<void>();

  /**
   * Property zoneSearchChanged
   * @readonly
   *
   * @description
   * Server-side descendant zone search.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<string>}
   */
  public readonly zoneSearchChanged: OutputEmitterRef<string> = output<string>();

  /**
   * Property equipmentSearchChanged
   * @readonly
   *
   * @description
   * Server-side descendant equipment search.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<string>}
   */
  public readonly equipmentSearchChanged: OutputEmitterRef<string> = output<string>();

  /**
   * Property zonePageChanged
   * @readonly
   *
   * @description
   * Requests another candidate facility server page.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<number>}
   */
  public readonly zonePageChanged: OutputEmitterRef<number> = output<number>();

  /**
   * Property equipmentPageChanged
   * @readonly
   *
   * @description
   * Requests another candidate equipment server page.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<number>}
   */
  public readonly equipmentPageChanged: OutputEmitterRef<number> = output<number>();

  /**
   * Property showZonesChanged
   * @readonly
   *
   * @description
   * The zone-polygon layer switch was toggled.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<boolean>}
   */
  public readonly showZonesChanged: OutputEmitterRef<boolean> = output<boolean>();

  /**
   * Property showEquipmentChanged
   * @readonly
   *
   * @description
   * The equipment-pin layer switch was toggled.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<boolean>}
   */
  public readonly showEquipmentChanged: OutputEmitterRef<boolean> = output<boolean>();

  /**
   * Property zoneDrawTargetPicked
   * @readonly
   *
   * @description
   * A zone/area was picked from the `draw-zone` picker.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<string>}
   */
  public readonly zoneDrawTargetPicked: OutputEmitterRef<string> = output<string>();

  /**
   * Property equipmentPlacePicked
   * @readonly
   *
   * @description
   * An equipment item was picked from the `place-pin` picker.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<string>}
   */
  public readonly equipmentPlacePicked: OutputEmitterRef<string> = output<string>();

  /**
   * Property zonePickerOpened
   * @readonly
   *
   * @description
   * The `draw-zone` picker was opened — the page loads its candidates, guarded against a duplicate
   * fetch.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly zonePickerOpened: OutputEmitterRef<void> = output<void>();

  /**
   * Property equipmentPickerOpened
   * @readonly
   *
   * @description
   * The `place-pin` picker was opened — the page loads its candidates, guarded against a duplicate
   * fetch.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly equipmentPickerOpened: OutputEmitterRef<void> = output<void>();

  /**
   * Property undoVertexRequested
   * @readonly
   *
   * @description
   * "Undo last vertex" was activated.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly undoVertexRequested: OutputEmitterRef<void> = output<void>();

  /**
   * Property closePolygonRequested
   * @readonly
   *
   * @description
   * "Close polygon" was activated.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly closePolygonRequested: OutputEmitterRef<void> = output<void>();

  /**
   * Property enterCoordinatesRequested
   * @readonly
   *
   * @description
   * "Enter coordinates" — the `draw-zone` mode's keyboard alternative to tapping the plan.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly enterCoordinatesRequested: OutputEmitterRef<void> = output<void>();

  /**
   * Property enterPositionRequested
   * @readonly
   *
   * @description
   * "Enter position" — the `place-pin` mode's keyboard alternative to tapping the plan.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly enterPositionRequested: OutputEmitterRef<void> = output<void>();

  /**
   * Property editingCancelled
   * @readonly
   *
   * @description
   * "Cancel" was activated, leaving whichever mode is active.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly editingCancelled: OutputEmitterRef<void> = output<void>();

  /**
   * Property panelOpenRequested
   * @readonly
   *
   * @description
   * The mobile-mode panel opener was activated.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly panelOpenRequested: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Properties
  /**
   * Property editorFocusTarget
   * @readonly
   *
   * @description
   * The active keyboard editing control that replaces the disabled picker trigger.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<ElementRef<HTMLButtonElement> | undefined>}
   */
  protected readonly editorFocusTarget: Signal<ElementRef<HTMLButtonElement> | undefined> =
    viewChild<ElementRef<HTMLButtonElement>>('editorFocusTarget');

  /**
   * Property toolbar
   * @readonly
   *
   * @description
   * Stable fallback focus target while editor controls are updating.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<ElementRef<HTMLElement> | undefined>}
   */
  protected readonly toolbar: Signal<ElementRef<HTMLElement> | undefined> =
    viewChild<ElementRef<HTMLElement>>('toolbar');

  /**
   * Property drawZonePlaceholder
   * @readonly
   *
   * @description
   * "Draw a zone…" picker's placeholder.
   *
   * @access protected
   * @since unreleased
   *
   * @type {string}
   */
  protected readonly drawZonePlaceholder: string = $localize`:@@facility.plans.editor.drawZonePlaceholder:Draw a zone…`;

  /**
   * Property placePinPlaceholder
   * @readonly
   *
   * @description
   * "Place equipment…" picker's placeholder.
   *
   * @access protected
   * @since unreleased
   *
   * @type {string}
   */
  protected readonly placePinPlaceholder: string = $localize`:@@facility.plans.editor.placePinPlaceholder:Place equipment…`;

  /**
   * Property panelOpenerLabel
   * @readonly
   *
   * @description
   * The mobile-mode panel opener's label.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {string}
   */
  protected readonly panelOpenerLabel: string = $localize`:@@facility.plans.toolbar.openPanel:Zones and equipment`;

  /**
   * Property isMobileInteractionMode
   * @readonly
   *
   * @description
   * Selects mobile sheets and touch composition from the central interaction mode, independent of
   * width.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly isMobileInteractionMode: Signal<boolean> = inject(
    INTERACTION_CAPABILITIES_PORT,
  ).isMobileInteractionMode;

  /**
   * Property zoneSearch
   * @readonly
   *
   * @description
   * Ephemeral query for the mobile zone picker.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<string>}
   */
  protected readonly zoneSearch: WritableSignal<string> = signal<string>('');

  /**
   * Property equipmentSearch
   * @readonly
   *
   * @description
   * Ephemeral query for the mobile equipment picker.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<string>}
   */
  protected readonly equipmentSearch: WritableSignal<string> = signal<string>('');

  /**
   * Property filteredZoneCandidates
   * @readonly
   *
   * @description
   * Zone candidates matching the mobile drawer query.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<ReadonlyArray<FacilityOutput>>}
   */
  protected readonly filteredZoneCandidates: Signal<ReadonlyArray<FacilityOutput>> = computed(() =>
    this.zoneCandidates(),
  );

  /**
   * Property filteredEquipmentCandidates
   * @readonly
   *
   * @description
   * Equipment filtering belongs to the server, including all descendant records.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<ReadonlyArray<EquipmentOutput>>}
   */
  protected readonly filteredEquipmentCandidates: Signal<ReadonlyArray<EquipmentOutput>> = computed(
    () => this.equipmentCandidates(),
  );

  //#endregion

  //#region Methods
  /**
   * Method restoreEditorFocus
   * @method restoreEditorFocus
   *
   * @description
   * Focuses the active keyboard editing control after a picker closes because editing disables its
   * original trigger.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected restoreEditorFocus(): void {
    if (this.editMode() === 'none') return;

    (this.editorFocusTarget()?.nativeElement ?? this.toolbar()?.nativeElement)?.focus();
  }

  /**
   * Method equipmentCandidateLabel
   * @method equipmentCandidateLabel
   *
   * @description
   * A `place-pin` candidate's display label, from the shared plan-label composer.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {EquipmentOutput} candidate - The candidate equipment item.
   *
   * @returns {string} Its display label.
   */
  protected equipmentCandidateLabel(candidate: EquipmentOutput): string {
    return equipmentPlanLabel({
      type: candidate.type,
      serialNumber: candidate.serialNumber ?? null,
      locationLabel: candidate.locationLabel ?? null,
    });
  }

  /**
   * Method onZoneDrawTargetPicked
   * @method onZoneDrawTargetPicked
   *
   * @description
   * The `draw-zone` picker's `valueChange` — forwards a genuinely picked id, dropping a nullish
   * clear.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string | null | undefined} facilityId - The picked facility, or nullish when the
   *   selection cleared.
   *
   * @returns {boolean} Whether a selection command was emitted.
   */
  protected onZoneDrawTargetPicked(facilityId: string | null | undefined): boolean {
    if (!facilityId || !this.canWrite() || this.editMode() !== 'none') return false;

    this.zoneDrawTargetPicked.emit(facilityId);
    return true;
  }

  /**
   * Method onEquipmentPlacePicked
   * @method onEquipmentPlacePicked
   *
   * @description
   * The `place-pin` picker's `valueChange` — forwards a genuinely picked id, dropping a nullish
   * clear.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string | null | undefined} equipmentId - The picked equipment, or nullish when the
   *   selection cleared.
   *
   * @returns {boolean} Whether a selection command was emitted.
   */
  protected onEquipmentPlacePicked(equipmentId: string | null | undefined): boolean {
    if (!equipmentId || !this.canEditEquipment() || this.editMode() !== 'none') return false;

    this.equipmentPlacePicked.emit(equipmentId);
    return true;
  }

  /**
   * Method onZoneSearchChanged
   * @method onZoneSearchChanged
   *
   * @description
   * Updates the mobile zone picker query from its template input value.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} value - The search input value.
   *
   * @returns {void}
   */
  protected onZoneSearchChanged(value: string): void {
    this.zoneSearch.set(value);
    this.zoneSearchChanged.emit(value);
  }

  /**
   * Method onEquipmentSearchChanged
   * @method onEquipmentSearchChanged
   *
   * @description
   * Updates the mobile equipment picker query from its template input value.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} value - The search input value.
   *
   * @returns {void}
   */
  protected onEquipmentSearchChanged(value: string): void {
    this.equipmentSearch.set(value);
    this.equipmentSearchChanged.emit(value);
  }

  /**
   * Method onZoneDrawerStateChanged
   * @method onZoneDrawerStateChanged
   *
   * @description
   * Clears the mobile zone query when its drawer closes.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {'closed' | 'open'} state - The native drawer state.
   *
   * @returns {void}
   */
  protected onZoneDrawerStateChanged(state: 'closed' | 'open'): void {
    if (state === 'closed' && this.zoneSearch() !== '') this.onZoneSearchChanged('');
  }

  /**
   * Method onEquipmentDrawerStateChanged
   * @method onEquipmentDrawerStateChanged
   *
   * @description
   * Clears the mobile equipment query when its drawer closes.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {'closed' | 'open'} state - The native drawer state.
   *
   * @returns {void}
   */
  protected onEquipmentDrawerStateChanged(state: 'closed' | 'open'): void {
    if (state === 'closed' && this.equipmentSearch() !== '') this.onEquipmentSearchChanged('');
  }
  //#endregion
}
