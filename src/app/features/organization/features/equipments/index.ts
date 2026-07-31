/**
 * Equipments feature public API.
 *
 * Deliberately narrow: the onboarding equipment form is the only external
 * consumer, and it needs the type option set alone.
 *
 * It used to `export *` the state, models, data-access and options trees. A
 * barrel that re-exports everything drags the stores and the transport services
 * along with any one import, so a single option list welded the whole feature
 * into onboarding's chunk. Internal code imports the deep paths directly.
 */
export { EQUIPMENT_TYPE_OPTIONS } from './options';
