import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideBan, lucideCircleCheck, lucidePackage, lucideWrench } from '@ng-icons/lucide';
import {
  resolveEquipmentStatusTag,
  resolveFacilityStatusTag,
  type FacilityPlanOverlayOutput,
} from '@features/organization/features/facilities/models';
import type { PlanPoint } from '@shared/plan-viewer';
import { equipmentPlanLabel } from '../../../utils';
import { EQUIPMENT_PIN_SEVERITY_ICON_CLASS } from './constants/equipment-pin-severity-icon-class.constants';
import type { FacilityPlanOverlayEquipmentView, FacilityPlanOverlayZoneView } from './models';
import { normalizedPointToPixel, polygonCentroid } from './utils';

/** The `<pattern>` id the zone hatch fill references; one overlay renders per plan viewer at a time. */
const HATCH_PATTERN_ID = 'facility-plan-overlay-hatch';

/**
 * Component FacilityPlanOverlay
 * @class FacilityPlanOverlay
 *
 * @description
 * The read-only zone/equipment overlay for one floor plan, projected into
 * `app-plan-viewer`'s `overlayTemplate` — it renders inside the viewer's
 * transformed stage, so its image-pixel coordinates inherit pan and zoom
 * through the DOM automatically. Zones render as a neutral (per
 * `DESIGN.md`'s glyph rule) hatch-filled SVG polygon with a name label at its centroid,
 * each wrapped in a focusable, keyboard-activatable SVG `<a>` (`role="button"`
 * since it navigates via an emitted output, not a real `href`). Equipment
 * renders as positioned `<button>` pins, a status-coloured icon (never
 * colour-only — the accessible name always carries the status too),
 * counter-scaled by `1 / scale` so a pin keeps a constant on-screen size
 * while the viewer zooms — `scale` comes from `PlanViewerOverlayContext`,
 * the same context the projecting `ng-template` receives.
 *
 * {@link selectedZoneId}/{@link selectedEquipmentId} name whichever record
 * the panel's own detail block currently shows: the matching control
 * carries `aria-pressed="true"` and a non-chromatic visual cue of its own —
 * a thicker polygon outline for a zone, an added ring for a pin — since a
 * plain background-colour change on the plan itself would fail
 * `PRODUCT.md`'s never-colour-alone rule, and would in any case be
 * invisible to the same screen-reader user `aria-pressed` serves.
 *
 * Presentational: it takes the overlay data and emits which record was
 * activated; the host page owns the navigation and the selection state.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-facility-plan-overlay',
  imports: [NgIcon],
  providers: [provideIcons({ lucideBan, lucideCircleCheck, lucidePackage, lucideWrench })],
  templateUrl: './facility-plan-overlay.component.html',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacilityPlanOverlay {
  //#region Inputs
  /**
   * Property overlay
   * @readonly
   * @description The floor plan's zone/equipment overlay data; null while unloaded.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<FacilityPlanOverlayOutput | null>}
   */
  public readonly overlay: InputSignal<FacilityPlanOverlayOutput | null> =
    input<FacilityPlanOverlayOutput | null>(null);

  /**
   * Property scale
   * @readonly
   * @description The plan viewer's current zoom scale, used to counter-scale equipment pins.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<number>}
   */
  public readonly scale: InputSignal<number> = input<number>(1);

  /**
   * Property showZones
   * @readonly
   * @description Whether the zone-polygon layer renders.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly showZones: InputSignal<boolean> = input<boolean>(true);

  /**
   * Property showEquipment
   * @readonly
   * @description Whether the equipment-pin layer renders.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly showEquipment: InputSignal<boolean> = input<boolean>(true);

  /**
   * Property selectedZoneId
   * @readonly
   * @description The currently selected zone's facility id, or `null` — drives `aria-pressed` and the thicker outline on the matching polygon, the plan's own indication of what the panel's detail block is showing.
   * @access public
   * @since 1.13.0
   * @type {InputSignal<string | null>}
   */
  public readonly selectedZoneId: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property selectedEquipmentId
   * @readonly
   * @description The currently selected equipment pin's id, or `null` — drives `aria-pressed` and the added ring on the matching pin.
   * @access public
   * @since 1.13.0
   * @type {InputSignal<string | null>}
   */
  public readonly selectedEquipmentId: InputSignal<string | null> = input<string | null>(null);
  //#endregion

  //#region Outputs
  /** Emits the facility id of the zone the member activated. */
  public readonly zoneActivated: OutputEmitterRef<string> = output<string>();

  /** Emits the equipment id of the pin the member activated. */
  public readonly equipmentActivated: OutputEmitterRef<string> = output<string>();
  //#endregion

  //#region Properties
  /** The `<pattern>` id the zone hatch fill references. */
  protected readonly hatchPatternId: string = HATCH_PATTERN_ID;

  /**
   * Property viewBox
   * @readonly
   * @description The overlay SVG's `viewBox`, matching the plan's natural pixel size.
   * @access protected
   * @since 1.0.0
   * @type {Signal<string>}
   */
  protected readonly viewBox: Signal<string> = computed<string>(() => {
    const data: FacilityPlanOverlayOutput | null = this.overlay();

    return data ? `0 0 ${data.imageWidth} ${data.imageHeight}` : '0 0 0 0';
  });

  /**
   * Property zoneViews
   * @readonly
   * @description Zones pre-computed into image-pixel polygons with a centroid label position.
   * @access protected
   * @since 1.0.0
   * @type {Signal<ReadonlyArray<FacilityPlanOverlayZoneView>>}
   */
  protected readonly zoneViews: Signal<ReadonlyArray<FacilityPlanOverlayZoneView>> = computed<
    ReadonlyArray<FacilityPlanOverlayZoneView>
  >(() => {
    const data: FacilityPlanOverlayOutput | null = this.overlay();
    if (!data) return [];

    return data.zones.map((zone) => {
      const pixelPoints: PlanPoint[] = zone.points.map(([x, y]) =>
        normalizedPointToPixel({ x, y }, data.imageWidth, data.imageHeight),
      );
      const statusLabel: string = resolveFacilityStatusTag(zone.status).label;

      return {
        facilityId: zone.facilityId,
        name: zone.name,
        pointsAttr: pixelPoints.map((point) => `${point.x},${point.y}`).join(' '),
        label: polygonCentroid(pixelPoints),
        ariaLabel: $localize`:@@facility.plans.overlay.zoneAria:Zone ${zone.name}:name: — ${statusLabel}:status:`,
      };
    });
  });

  /**
   * Property equipmentViews
   * @readonly
   * @description Equipment pre-computed into image-pixel positions with a resolved status descriptor.
   * @access protected
   * @since 1.0.0
   * @type {Signal<ReadonlyArray<FacilityPlanOverlayEquipmentView>>}
   */
  protected readonly equipmentViews: Signal<ReadonlyArray<FacilityPlanOverlayEquipmentView>> =
    computed<ReadonlyArray<FacilityPlanOverlayEquipmentView>>(() => {
      const data: FacilityPlanOverlayOutput | null = this.overlay();
      if (!data) return [];

      return data.equipment.map((item) => {
        const descriptor = resolveEquipmentStatusTag(item.status);

        return {
          equipmentId: item.equipmentId,
          position: normalizedPointToPixel(
            { x: item.x, y: item.y },
            data.imageWidth,
            data.imageHeight,
          ),
          descriptor,
          iconClass: EQUIPMENT_PIN_SEVERITY_ICON_CLASS[descriptor.severity],
          ariaLabel: $localize`:@@facility.plans.overlay.equipmentAria:${equipmentPlanLabel(item)}:name: — ${descriptor.label}:status:`,
        };
      });
    });

  /**
   * Property pinScale
   * @readonly
   *
   * @description
   * The inverse of the viewer's current zoom, applied to each equipment pin
   * so it keeps a constant on-screen size while the plan is zoomed — the
   * pin sits inside the same transformed stage as the plan image, so
   * without this it would scale with the plan itself. Guards a zero/negative
   * `scale` (never expected, but would otherwise divide to `Infinity`).
   *
   * @access protected
   * @since 1.0.0
   * @type {Signal<number>}
   */
  protected readonly pinScale: Signal<number> = computed<number>(() => {
    const scale: number = this.scale();

    return scale > 0 ? 1 / scale : 1;
  });
  //#endregion

  //#region Methods
  /**
   * Method onZoneActivate
   * @description Emits the activated zone's facility id.
   * @access protected
   * @since 1.0.0
   * @param {string} facilityId - The zone's facility id.
   * @returns {void}
   */
  protected onZoneActivate(facilityId: string): void {
    this.zoneActivated.emit(facilityId);
  }

  /**
   * Method onZoneKeydown
   * @description Activates a zone on Enter or Space, since the SVG `<a>` carries no real `href`.
   * @access protected
   * @since 1.0.0
   * @param {KeyboardEvent} event - The key event.
   * @param {string} facilityId - The zone's facility id.
   * @returns {void}
   */
  protected onZoneKeydown(event: KeyboardEvent, facilityId: string): void {
    if (event.key !== 'Enter' && event.key !== ' ') return;

    event.preventDefault();
    this.onZoneActivate(facilityId);
  }

  /**
   * Method onEquipmentActivate
   * @description Emits the activated pin's equipment id.
   * @access protected
   * @since 1.0.0
   * @param {string} equipmentId - The pin's equipment id.
   * @returns {void}
   */
  protected onEquipmentActivate(equipmentId: string): void {
    this.equipmentActivated.emit(equipmentId);
  }
  //#endregion
}
