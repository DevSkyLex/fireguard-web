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
 * Interface InterventionPlanningOptionsState
 * @interface InterventionPlanningOptionsState
 *
 * @description
 * Holds option catalogues, selected-resource reads, and request states for intervention planning.
 */
export interface InterventionPlanningOptionsState {
  /**
   * Property selectionCallStates
   * @readonly
   *
   * @description
   * Independent reads for selected resources outside the loaded catalogue pages.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {Readonly<Record<string, CallState>>}
   */
  readonly selectionCallStates: Readonly<Record<string, CallState>>;

  /**
   * Property catalogues
   * @readonly
   *
   * @description
   * Loaded option catalogues keyed by the planning resource they serve.
   *
   * @access public
   *
   * @type {Partial<Record<PlanningCatalogueKind, PlanningCatalogueState>>}
   */
  readonly catalogues: Partial<Record<PlanningCatalogueKind, PlanningCatalogueState>>;

  /**
   * Property sites
   * @readonly
   *
   * @description
   * Site options resolved for the current planning form.
   *
   * @access public
   *
   * @type {readonly SelectOption[]}
   */
  readonly sites: readonly SelectOption[];

  /**
   * Property targets
   * @readonly
   *
   * @description
   * Resource options used to select the target of an intervention work item.
   *
   * @access public
   *
   * @type {readonly SelectOption[]}
   */
  readonly targets: readonly SelectOption[];

  /**
   * Property members
   * @readonly
   *
   * @description
   * Member options available for intervention assignment.
   *
   * @access public
   *
   * @type {readonly MemberSelectOption[]}
   */
  readonly members: readonly MemberSelectOption[];

  /**
   * Property labels
   * @readonly
   *
   * @description
   * Organization's intervention labels, loaded for the workspace flow only
   * (the sidebar label editor); empty for the creation flow.
   *
   * @access public
   *
   * @type {readonly InterventionLabelOutput[]}
   */
  readonly labels: readonly InterventionLabelOutput[];

  /**
   * Property templates
   * @readonly
   *
   * @description
   * Organization's intervention templates, loaded for the creation flow only
   * (the "start from a template" picker); empty for the workspace flow.
   *
   * @access public
   *
   * @type {readonly InterventionTemplateOutput[]}
   */
  readonly templates: readonly InterventionTemplateOutput[];

  /**
   * Property loadCallState
   * @readonly
   *
   * @description
   * Lifecycle of the planning-options load (pending / success / error).
   *
   * @access public
   *
   * @type {CallState}
   */
  readonly loadCallState: CallState;
}
