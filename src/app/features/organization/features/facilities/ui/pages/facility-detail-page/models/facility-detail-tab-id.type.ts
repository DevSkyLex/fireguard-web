/**
 * Type FacilityDetailTabId
 *
 * @description
 * Which of the facility record's three tabs is showing: `overview` (the
 * hierarchy chart and the equipment/inspection summary), `information` (the
 * editable identification fields, `FacilityInformationPanel`), or `plans`
 * (the floor plans, `FacilityPlanList` + `PlanViewer`).
 *
 * @since 1.1.0
 */
export type FacilityDetailTabId = 'overview' | 'information' | 'plans';
