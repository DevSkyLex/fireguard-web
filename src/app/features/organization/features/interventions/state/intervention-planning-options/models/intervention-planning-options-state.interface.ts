import type { CallState } from '@core/request-state';
import type {
  InterventionLabelOutput,
  InterventionTemplateOutput,
  MemberSelectOption,
  SelectOption,
  PlanningCatalogueKind,
  PlanningCatalogueState,
} from '@features/organization/features/interventions/models';

/**
 * State consumed by intervention planning controls.
 */
export interface InterventionPlanningOptionsState {
  /**
   * Property selectionCallStates
   * @readonly
   * @description Independent reads for selected resources outside the loaded catalogue pages.
   * @access public
   * @since 1.0.0
   * @type {Readonly<Record<string, CallState>>}
   */
  readonly selectionCallStates: Readonly<Record<string, CallState>>;
  readonly catalogues: Partial<Record<PlanningCatalogueKind, PlanningCatalogueState>>;
  readonly sites: readonly SelectOption[];
  readonly targets: readonly SelectOption[];
  readonly members: readonly MemberSelectOption[];

  /**
   * Organization's intervention labels, loaded for the workspace flow only
   * (the sidebar label editor); empty for the creation flow.
   */
  readonly labels: readonly InterventionLabelOutput[];

  /**
   * Organization's intervention templates, loaded for the creation flow only
   * (the "start from a template" picker); empty for the workspace flow.
   */
  readonly templates: readonly InterventionTemplateOutput[];

  /** Lifecycle of the planning-options load (pending / success / error). */
  readonly loadCallState: CallState;
}
