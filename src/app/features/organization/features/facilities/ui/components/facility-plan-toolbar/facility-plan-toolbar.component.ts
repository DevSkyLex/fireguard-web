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
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideBox, lucideBoxes, lucideList, lucideMapPin } from '@ng-icons/lucide';
import type { EquipmentOutput } from '@features/organization/features/equipments/models';
import type { FacilityOutput } from '@features/organization/features/facilities/models';
import type { FacilityPlanEditMode } from '@features/organization/features/facilities/state';
import { isCompact } from '@shared/breakpoint';
import { HlmButton } from '@shared/ui/button';
import { HlmDrawerImports } from '@shared/ui/drawer';
import { HlmInput } from '@shared/ui/input';
import { HlmItem, HlmItemContent, HlmItemGroup, HlmItemMedia, HlmItemTitle } from '@shared/ui/item';
import { HlmSelectImports } from '@shared/ui/select';
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
 * left (layer switches, the compact panel opener), one on the right (the 3D
 * link, the `draw-zone`/`place-pin` pickers and their in-mode controls).
 * Candidate catalogs may contain hundreds of records, so those two pickers
 * remain Spartan selects on desktop and become searchable Spartan bottom
 * drawers on compact viewports.
 *
 * Presentational: inputs and outputs only, no store or service
 * (`ARCHITECTURE.md` §10.3). The page owns every store write a control here
 * triggers, including the pickers' `null`-clearing selection events — this
 * component only forwards a genuinely picked id.
 *
 * @since 1.0.0
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
  ],
  providers: [provideIcons({ lucideBox, lucideBoxes, lucideList, lucideMapPin })],
  templateUrl: './facility-plan-toolbar.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacilityPlanToolbar {
  //#region Inputs
  /** Whether the facility is a `building` — the "3D view" link only ever makes sense there. */
  public readonly is3dLinkVisible: InputSignal<boolean> = input<boolean>(false);

  /** Where the "3D view" link points. */
  public readonly plan3dRoute: InputSignal<ReadonlyArray<string>> = input<ReadonlyArray<string>>(
    [],
  );

  /** Whether the overlay's zone-polygon layer is shown. */
  public readonly showZones: InputSignal<boolean> = input<boolean>(true);

  /** Whether the overlay's equipment-pin layer is shown. */
  public readonly showEquipment: InputSignal<boolean> = input<boolean>(true);

  /** Whether the loaded overlay carries at least one zone or pin — gates the layer switches. */
  public readonly overlayHasContent: InputSignal<boolean> = input<boolean>(false);

  /** Whether the compact-viewport panel opener renders — mirrors `FacilityBuilding3dPage`'s own toolbar button. */
  public readonly panelOpenerVisible: InputSignal<boolean> = input<boolean>(false);

  /** Whether the member may draw/clear a zone outline. */
  public readonly canWrite: InputSignal<boolean> = input<boolean>(false);

  /** Whether the member may place, move, or remove an equipment pin. */
  public readonly canEditEquipment: InputSignal<boolean> = input<boolean>(false);

  /** The editor's current pointer-editing mode. */
  public readonly editMode: InputSignal<FacilityPlanEditMode> = input<FacilityPlanEditMode>('none');

  /** The `draw-zone` picker's option list — zones/areas not yet drawn on this plan. */
  public readonly zoneCandidates: InputSignal<ReadonlyArray<FacilityOutput>> = input<
    ReadonlyArray<FacilityOutput>
  >([]);

  /** The `place-pin` picker's option list — equipment not yet pinned on this plan. */
  public readonly equipmentCandidates: InputSignal<ReadonlyArray<EquipmentOutput>> = input<
    ReadonlyArray<EquipmentOutput>
  >([]);

  /** Whether the zone candidate request is in flight. */
  public readonly zoneCandidatesLoading: InputSignal<boolean> = input<boolean>(false);

  /** Whether the last zone candidate request failed. */
  public readonly zoneCandidatesFailed: InputSignal<boolean> = input<boolean>(false);

  /** Whether the equipment candidate request is in flight. */
  public readonly equipmentCandidatesLoading: InputSignal<boolean> = input<boolean>(false);

  /** Whether the last equipment candidate request failed. */
  public readonly equipmentCandidatesFailed: InputSignal<boolean> = input<boolean>(false);

  /** The in-progress `draw-zone` outline's vertex count — disables "Undo"/"Close polygon" below the minimum. */
  public readonly draftPointCount: InputSignal<number> = input<number>(0);

  /** Whether a zone outline write is in flight — disables "Close polygon" for its duration. */
  public readonly isSavingZoneGeometry: InputSignal<boolean> = input<boolean>(false);

  /** The active mode's status line, e.g. the vertex count while drawing — computed by the page from store data. */
  public readonly statusLabel: InputSignal<string> = input<string>('');
  //#endregion

  //#region Outputs
  /** The zone-polygon layer switch was toggled. */
  public readonly showZonesChanged: OutputEmitterRef<boolean> = output<boolean>();

  /** The equipment-pin layer switch was toggled. */
  public readonly showEquipmentChanged: OutputEmitterRef<boolean> = output<boolean>();

  /** A zone/area was picked from the `draw-zone` picker. */
  public readonly zoneDrawTargetPicked: OutputEmitterRef<string> = output<string>();

  /** An equipment item was picked from the `place-pin` picker. */
  public readonly equipmentPlacePicked: OutputEmitterRef<string> = output<string>();

  /** The `draw-zone` picker was opened — the page loads its candidates, guarded against a duplicate fetch. */
  public readonly zonePickerOpened: OutputEmitterRef<void> = output<void>();

  /** The `place-pin` picker was opened — the page loads its candidates, guarded against a duplicate fetch. */
  public readonly equipmentPickerOpened: OutputEmitterRef<void> = output<void>();

  /** "Undo last vertex" was activated. */
  public readonly undoVertexRequested: OutputEmitterRef<void> = output<void>();

  /** "Close polygon" was activated. */
  public readonly closePolygonRequested: OutputEmitterRef<void> = output<void>();

  /** "Enter coordinates" — the `draw-zone` mode's keyboard alternative to tapping the plan. */
  public readonly enterCoordinatesRequested: OutputEmitterRef<void> = output<void>();

  /** "Enter position" — the `place-pin` mode's keyboard alternative to tapping the plan. */
  public readonly enterPositionRequested: OutputEmitterRef<void> = output<void>();

  /** "Cancel" was activated, leaving whichever mode is active. */
  public readonly editingCancelled: OutputEmitterRef<void> = output<void>();

  /** The compact-viewport panel opener was activated. */
  public readonly panelOpenRequested: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Properties
  /** "Draw a zone…" picker's placeholder. */
  protected readonly drawZonePlaceholder: string = $localize`:@@facility.plans.editor.drawZonePlaceholder:Draw a zone…`;

  /** "Place equipment…" picker's placeholder. */
  protected readonly placePinPlaceholder: string = $localize`:@@facility.plans.editor.placePinPlaceholder:Place equipment…`;

  /** The compact-viewport panel opener's label. */
  protected readonly panelOpenerLabel: string = $localize`:@@facility.plans.toolbar.openPanel:Zones and equipment`;

  /** Whether dense editor candidate lists should use touch-first bottom drawers. */
  protected readonly compact: Signal<boolean> = isCompact();

  /** Ephemeral query for the compact zone picker. */
  protected readonly zoneSearch: WritableSignal<string> = signal<string>('');

  /** Ephemeral query for the compact equipment picker. */
  protected readonly equipmentSearch: WritableSignal<string> = signal<string>('');

  /** Zone candidates matching the compact drawer query. */
  protected readonly filteredZoneCandidates: Signal<ReadonlyArray<FacilityOutput>> = computed(
    () => {
      const query: string = this.zoneSearch().trim().toLocaleLowerCase();
      if (query.length === 0) return this.zoneCandidates();
      return this.zoneCandidates().filter((candidate: FacilityOutput): boolean =>
        candidate.name.toLocaleLowerCase().includes(query),
      );
    },
  );

  /** Equipment candidates matching the compact drawer query. */
  protected readonly filteredEquipmentCandidates: Signal<ReadonlyArray<EquipmentOutput>> = computed(
    () => {
      const query: string = this.equipmentSearch().trim().toLocaleLowerCase();
      if (query.length === 0) return this.equipmentCandidates();
      return this.equipmentCandidates().filter((candidate: EquipmentOutput): boolean =>
        this.equipmentCandidateLabel(candidate).toLocaleLowerCase().includes(query),
      );
    },
  );

  //#endregion

  //#region Methods
  /**
   * Method equipmentCandidateLabel
   * @description A `place-pin` candidate's display label, from the shared plan-label composer.
   * @access protected
   * @since 1.0.0
   * @param {EquipmentOutput} candidate - The candidate equipment item.
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
   * @description The `draw-zone` picker's `valueChange` — forwards a genuinely picked id, dropping a nullish clear.
   * @access protected
   * @since 1.0.0
   * @param {string | null | undefined} facilityId - The picked facility, or nullish when the selection cleared.
   * @returns {void}
   */
  protected onZoneDrawTargetPicked(facilityId: string | null | undefined): void {
    if (!facilityId) return;

    this.zoneDrawTargetPicked.emit(facilityId);
  }

  /**
   * Method onEquipmentPlacePicked
   * @description The `place-pin` picker's `valueChange` — forwards a genuinely picked id, dropping a nullish clear.
   * @access protected
   * @since 1.0.0
   * @param {string | null | undefined} equipmentId - The picked equipment, or nullish when the selection cleared.
   * @returns {void}
   */
  protected onEquipmentPlacePicked(equipmentId: string | null | undefined): void {
    if (!equipmentId) return;

    this.equipmentPlacePicked.emit(equipmentId);
  }

  /** Mirrors a mobile zone search input into its ephemeral query. */
  protected onZoneSearchChanged(event: Event): void {
    this.zoneSearch.set((event.target as HTMLInputElement).value);
  }

  /** Mirrors a mobile equipment search input into its ephemeral query. */
  protected onEquipmentSearchChanged(event: Event): void {
    this.equipmentSearch.set((event.target as HTMLInputElement).value);
  }

  /** Clears the compact zone query when its drawer closes. */
  protected onZoneDrawerStateChanged(state: 'closed' | 'open'): void {
    if (state === 'closed') this.zoneSearch.set('');
  }

  /** Clears the compact equipment query when its drawer closes. */
  protected onEquipmentDrawerStateChanged(state: 'closed' | 'open'): void {
    if (state === 'closed') this.equipmentSearch.set('');
  }
  //#endregion
}
