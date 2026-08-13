import type { InterventionWorkItemOutput } from '../intervention-work-item/intervention-work-item-output.interface';

/**
 * What `InterventionConfirmDialog` emits once its pending request is
 * accepted — the same union as {@link InterventionConfirmRequest}, except the
 * `skipWorkItem` variant carries the reason typed into the dialog, which the
 * request it was opened from never held.
 */
export type InterventionConfirmAcceptedEvent =
  | { readonly kind: 'abandon' }
  | { readonly kind: 'deleteIntervention' }
  | { readonly kind: 'deleteWorkItem'; readonly workItem: InterventionWorkItemOutput }
  | {
      readonly kind: 'skipWorkItem';
      readonly workItem: InterventionWorkItemOutput;
      readonly reason: string;
    };
