/**
 * Interface ComplianceBucketTagDescriptor
 * @interface ComplianceBucketTagDescriptor
 *
 * @description
 * The presentation triple for a `ComplianceBucket` value: a localized label,
 * a badge severity, and an icon — the compliance badge always renders label
 * and icon together, never severity color alone.
 */
export interface ComplianceBucketTagDescriptor {
  //#region Properties
  /** Localized, human-readable label. */
  readonly label: string;

  /** Badge severity, driving the icon colour alone — the badge itself stays `outline`. */
  readonly severity: 'success' | 'warning' | 'danger' | 'neutral';

  /** `ng-icons` icon name rendered beside the label. */
  readonly icon: string;
  //#endregion
}
