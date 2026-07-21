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
import { ButtonModule } from 'primeng/button';
import type { FacilityOutput } from '@features/organization/features/facilities/models';
import {
  resolveComplianceBucket,
  type ComplianceBucketDescriptor,
} from '@features/organization/models';
import { resolveFacilityCity } from '@features/organization/utils';

/**
 * Component MapFacilityCard
 * @class MapFacilityCard
 *
 * @description
 * Presentational sidebar card for one located facility: name, city, a
 * Buildings/Equipment stat pair, a compliance bar (always paired with its
 * word, never color-only) and an "Open in Facilities" link. Purely
 * presentational — the page supplies the facility and its derived stats and
 * owns selection/navigation.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-map-facility-card
 *   [facility]="facility"
 *   [buildingsCount]="3"
 *   [complianceRate]="92"
 *   [selected]="facility.id === selectedFacilityId()"
 *   (select)="onSelect()"
 *   (open)="onOpen()"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-map-facility-card',
  imports: [ButtonModule],
  templateUrl: './map-facility-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapFacilityCard {
  //#region Inputs
  /**
   * Property facility
   * @readonly
   *
   * @description
   * The located facility this card renders.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<FacilityOutput>}
   */
  public readonly facility: InputSignal<FacilityOutput> = input.required<FacilityOutput>();

  /**
   * Property buildingsCount
   * @readonly
   *
   * @description
   * Count of descendant facilities of type `building`, derived by the page
   * from the facility tree.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<number>}
   */
  public readonly buildingsCount: InputSignal<number> = input<number>(0);

  /**
   * Property complianceRate
   * @readonly
   *
   * @description
   * Percentage, 0–100, or `null` when the facility tracks no scheduled
   * equipment (unmeasured, not failing).
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<number | null>}
   */
  public readonly complianceRate: InputSignal<number | null> = input<number | null>(null);

  /**
   * Property selected
   * @readonly
   *
   * @description
   * Whether this card is the currently-selected facility (from a pin click or
   * a prior card click), driving the highlighted state.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly selected: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Outputs
  /**
   * Property select
   * @readonly
   *
   * @description
   * Emitted when the card itself is activated, so the page can select this
   * facility and highlight/fly to its pin.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly select: OutputEmitterRef<void> = output<void>();

  /**
   * Property open
   * @readonly
   *
   * @description
   * Emitted when "Open in Facilities" is activated, so the page can navigate
   * to the facility's detail page.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly open: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Properties
  /**
   * Property city
   * @readonly
   *
   * @description
   * The facility's city, or `null` when none is on file.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string | null>}
   */
  protected readonly city: Signal<string | null> = computed((): string | null =>
    resolveFacilityCity(this.facility()),
  );

  /**
   * Property complianceBucket
   * @readonly
   *
   * @description
   * The resolved compliance bucket, driving the bar color and its paired word.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<ComplianceBucketDescriptor>}
   */
  protected readonly complianceBucket: Signal<ComplianceBucketDescriptor> = computed(
    (): ComplianceBucketDescriptor => resolveComplianceBucket(this.complianceRate()),
  );

  /**
   * Property complianceBarWidth
   * @readonly
   *
   * @description
   * Inline width percentage for the bar fill; 0 when unmeasured so no bar
   * reads as a (false) zero score.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<number>}
   */
  protected readonly complianceBarWidth: Signal<number> = computed(
    (): number => this.complianceRate() ?? 0,
  );
  //#endregion

  //#region Methods
  /**
   * Method complianceLabel
   * @method complianceLabel
   *
   * @description
   * Formats the compliance percentage, or an em dash when unmeasured.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {string} The label to render next to the bar.
   */
  protected complianceLabel(): string {
    const rate: number | null = this.complianceRate();
    return rate === null ? '—' : `${Math.round(rate)}%`;
  }
  //#endregion
}
