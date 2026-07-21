import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  COMPLIANCE_BUCKET_LEGEND,
  type ComplianceBucketDescriptor,
} from '@features/organization/models';

/**
 * Component MapLegend
 * @class MapLegend
 *
 * @description
 * Small overlay card explaining what a pin's color means on the organization
 * map: one dot per compliance bucket, each paired with its word so the
 * meaning never rests on color alone. The three buckets are fixed
 * organization-feature presentation data (mirrored by pins and the
 * facilities panel's cards through the same registry), so this component
 * takes no inputs.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-map-legend class="absolute left-3 top-3 z-10" />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-map-legend',
  templateUrl: './map-legend.component.html',
  host: {
    class:
      'flex flex-col gap-2 rounded-lg border border-surface-200 bg-surface-0/95 px-3.5 py-2.5 text-xs shadow-md backdrop-blur-sm pointer-events-none dark:border-surface-800 dark:bg-surface-950/95',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapLegend {
  //#region Properties
  /**
   * Property buckets
   * @readonly
   *
   * @description
   * The measured compliance buckets to list, worst excluded is the
   * "unmeasured" bucket — the legend explains a colored pin, not the absence
   * of one.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {readonly ComplianceBucketDescriptor[]}
   */
  protected readonly buckets: readonly ComplianceBucketDescriptor[] = COMPLIANCE_BUCKET_LEGEND;
  //#endregion
}
