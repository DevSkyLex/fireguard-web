import type { CallState } from '@core/request-state';
import type {
  ComplianceFacilityTreeOutput,
  ComplianceSummaryOutput,
} from '@features/organization/models';

/**
 * Interface ComplianceExplorerState
 * @interface ComplianceExplorerState
 *
 * @description
 * Component-scoped state backing the estate explorer's compliance axis:
 * three independent `CallState` fields, since the tree, the selected
 * facility's summary, and an in-flight export are unrelated requests that
 * must not share one status.
 */
export interface ComplianceExplorerState {
  //#region Properties
  /** Async lifecycle of the enriched facility hierarchy request. */
  readonly treeCallState: CallState<ComplianceFacilityTreeOutput>;

  /** Async lifecycle of the selected (or organization-wide) compliance summary request. */
  readonly summaryCallState: CallState<ComplianceSummaryOutput>;

  /** Async lifecycle of the safety-register export in flight, if any. */
  readonly exportCallState: CallState;
  //#endregion
}
