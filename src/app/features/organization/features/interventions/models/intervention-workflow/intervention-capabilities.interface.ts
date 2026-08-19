import type { Signal } from '@angular/core';
import type { InterventionStatus } from '../intervention/intervention-status.type';
import type { InterventionTransitionCapability } from '../intervention/intervention-transition-capability.type';
import type { InterventionPhase } from './intervention-phase.type';

/**
 * Interface InterventionCapabilities
 * @interface InterventionCapabilities
 *
 * @description
 * The derived capability surface of the intervention detail workspace —
 * lifecycle phase, the status-menu targets, and the action gates — produced
 * by `createInterventionCapabilities` from the page's own signals. The action
 * gates read the API's own `InterventionOutput.allowedActions` block, which
 * the backend computes with the same policy that enforces each mutation, so
 * they cannot drift from a write's actual outcome; only the presentational
 * derivations (phase, menu composition, labels, scanning) are client-side.
 */
export interface InterventionCapabilities {
  /** Where the intervention sits in its lifecycle, derived from its status. */
  readonly phase: Signal<InterventionPhase>;
  /** The forward status the phase's canonical action dispatches, null in review. */
  readonly commandTransitionTarget: Signal<InterventionStatus | null>;
  /** Whether the member may plan. */
  readonly canPlan: Signal<boolean>;
  /** Whether the member may record field work. */
  readonly canExecute: Signal<boolean>;
  /** Whether the member may review. */
  readonly canReview: Signal<boolean>;
  /** Whether this caller may publish the submitted intervention — server-advertised. */
  readonly canPublish: Signal<boolean>;
  /** Whether this caller may submit for review right now — server-advertised (identity + permission + transition legality). */
  readonly canSubmit: Signal<boolean>;
  /** Whether dates, priority and participants accept a write — server-advertised `canEditPlanning`. */
  readonly canEditSchedule: Signal<boolean>;
  /** Whether the site accepts a write — server-advertised, draft only. */
  readonly canEditSite: Signal<boolean>;
  /** Whether the responsible accepts a handover — server-advertised, draft and planned only. */
  readonly canEditResponsible: Signal<boolean>;
  /** Whether description and labels accept a write — server-advertised. */
  readonly canEditDetails: Signal<boolean>;
  /** Whether the "Manage labels…" trigger renders — `organization.interventions.write`, distinct from {@link canEditDetails}. */
  readonly canManageLabels: Signal<boolean>;
  /** Whether a team may be assigned — server-advertised. */
  readonly canAssignTeam: Signal<boolean>;
  /** Whether the scope may still grow — server-advertised `canMutateWorkItems`. */
  readonly canAddWorkItem: Signal<boolean>;
  /** Whether an item may be skipped with a reason — server-advertised `canMutateWorkItems`, in the execute phase. */
  readonly canSkipWorkItem: Signal<boolean>;
  /** Whether the intervention may be abandoned from its current status. */
  readonly canAbandon: Signal<boolean>;
  /** Whether the intervention may be deleted outright — server-advertised `canDelete`. */
  readonly canDeleteIntervention: Signal<boolean>;
  /** The statuses the status menu offers — the moves the action box does not own; the withdraw move is gated on the server-advertised `canWithdraw`. */
  readonly transitionTargets: Signal<readonly InterventionStatus[]>;
  /** Whether the signed-in member may reject a proposed change. */
  readonly canRejectChange: Signal<boolean>;
  /** Whether the attachments section offers upload and delete — server-advertised. */
  readonly canManageAttachments: Signal<boolean>;
  /** Whether QR scanning is offered, in the execute phase on capable devices. */
  readonly canScanWorkItem: Signal<boolean>;
  /** Whether the member holds the permission a transition capability demands. */
  readonly hasCapability: (capability: InterventionTransitionCapability) => boolean;
}
