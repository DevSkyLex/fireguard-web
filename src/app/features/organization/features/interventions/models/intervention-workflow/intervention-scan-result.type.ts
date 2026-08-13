import type { InterventionWorkItemOutput } from '../intervention-work-item/intervention-work-item-output.interface';

/**
 * The outcome of decoding a captured QR image against an intervention's work
 * items. One union rather than a matched item plus two booleans, so a caller
 * always narrows on `kind` instead of checking flags in the wrong order.
 */
export type InterventionScanResult =
  | { readonly kind: 'matched'; readonly item: InterventionWorkItemOutput }
  | { readonly kind: 'unreadable' }
  | { readonly kind: 'noMatch' };
