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
 * lifecycle phase, permission gates, the replanning mutability matrix and the
 * status-menu targets — produced by `createInterventionCapabilities` from the
 * page's own signals. Each member mirrors a backend rule; none decides
 * anything the API would not re-check.
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
  /** Whether the member may publish. */
  readonly canPublish: Signal<boolean>;
  /** Whether the signed-in member is the responsible agent (identity gate). */
  readonly canSubmit: Signal<boolean>;
  /** Whether dates, priority and participants accept a write. */
  readonly canEditSchedule: Signal<boolean>;
  /** Whether the site accepts a write — draft only. */
  readonly canEditSite: Signal<boolean>;
  /** Whether the responsible accepts a handover — draft and planned only. */
  readonly canEditResponsible: Signal<boolean>;
  /** Whether description and labels accept a write, until a terminal status. */
  readonly canEditDetails: Signal<boolean>;
  /** Whether the "Manage labels…" trigger renders — `organization.interventions.write`, distinct from {@link canEditDetails}. */
  readonly canManageLabels: Signal<boolean>;
  /** Whether a team may be assigned — `organization.interventions.plan`, through draft/planned/in_progress/changes_requested. */
  readonly canAssignTeam: Signal<boolean>;
  /** Whether the scope may still grow. */
  readonly canAddWorkItem: Signal<boolean>;
  /** Whether an item may be skipped with a reason. */
  readonly canSkipWorkItem: Signal<boolean>;
  /** Whether the intervention may be abandoned from its current status. */
  readonly canAbandon: Signal<boolean>;
  /** Whether the intervention may be deleted outright rather than abandoned. */
  readonly canDeleteIntervention: Signal<boolean>;
  /** The statuses the status menu offers — the moves the action box does not own. */
  readonly transitionTargets: Signal<readonly InterventionStatus[]>;
  /** Whether the signed-in member may reject a proposed change. */
  readonly canRejectChange: Signal<boolean>;
  /** Whether the attachments section offers upload and delete. */
  readonly canManageAttachments: Signal<boolean>;
  /** Whether QR scanning is offered, in the execute phase on capable devices. */
  readonly canScanWorkItem: Signal<boolean>;
  /** Whether the member holds the permission a transition capability demands. */
  readonly hasCapability: (capability: InterventionTransitionCapability) => boolean;
}
