import type { HydraCollection } from '@core/api/models';
import type { CallState } from '@core/request-state';
import type {
  ComplianceFacilityTreeOutput,
  ComplianceSummaryOutput,
  SafetyRegisterSnapshotOutput,
} from '@features/organization/models';

/**
 * Interface ComplianceExplorerState
 * @interface ComplianceExplorerState
 *
 * @description
 * Component-scoped state backing the estate explorer's compliance axis:
 * independent `CallState` fields, since the tree, the selected facility's
 * summary, an in-flight export, the archived-snapshot list, an in-flight
 * archive, and a per-row snapshot download are unrelated requests that must
 * not share one status.
 */
export interface ComplianceExplorerState {
  //#region Properties
  /** Async lifecycle of the enriched facility hierarchy request. */
  readonly treeCallState: CallState<ComplianceFacilityTreeOutput>;

  /** Async lifecycle of the selected (or organization-wide) compliance summary request. */
  readonly summaryCallState: CallState<ComplianceSummaryOutput>;

  /** Async lifecycle of the safety-register export in flight, if any. */
  readonly exportCallState: CallState;

  /** Async lifecycle of the archived register-snapshot page request. */
  readonly snapshotsCallState: CallState<HydraCollection<SafetyRegisterSnapshotOutput>>;

  /** Async lifecycle of the register-archive write in flight, if any. */
  readonly archiveCallState: CallState;

  /** Async lifecycle of the snapshot-PDF download in flight, if any. */
  readonly downloadCallState: CallState;

  /** The snapshot whose PDF download is in flight, if any. */
  readonly downloadingSnapshotId: string | null;
  //#endregion
}
