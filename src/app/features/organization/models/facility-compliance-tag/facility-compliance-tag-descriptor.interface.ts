import type { ComplianceBucket } from './facility-compliance-bucket.type';

/**
 * Interface ComplianceBucketDescriptor
 * @interface ComplianceBucketDescriptor
 *
 * @description
 * Presentation for one compliance bucket: a word (never color alone), a pin
 * fill for the map, and paired Tailwind classes for the sidebar's bar/text.
 */
export interface ComplianceBucketDescriptor {
  /** Which bucket this descriptor represents. */
  readonly bucket: ComplianceBucket;
  /** Short, localized word pairing the color so status is never color-only. */
  readonly label: string;
  /** Hex fill for the map pin (MapLibre paint expressions take static color values, not CSS variables). */
  readonly pinColor: string;
  /** Tailwind classes for the compliance bar fill. */
  readonly barClass: string;
  /** Tailwind classes for the accompanying percentage text. */
  readonly textClass: string;
}
