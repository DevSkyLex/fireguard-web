import { computed } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import type { InterventionHeaderState } from './models';

//#region Initial State
/**
 * Constant INITIAL_INTERVENTION_HEADER_STATE
 * @const INITIAL_INTERVENTION_HEADER_STATE
 *
 * @description
 * Initial state for the root-provided InterventionHeaderStore: no header
 * actions published, so the page-header slot renders nothing.
 *
 * @since 1.0.0
 *
 * @type {InterventionHeaderState}
 */
const INITIAL_INTERVENTION_HEADER_STATE: InterventionHeaderState = {
  commandAction: null,
  canRequestChanges: false,
  listPosition: null,
  showPrevNext: false,
  prevDisabled: true,
  nextDisabled: true,
  overflowItems: [],
} as const;
//#endregion

/**
 * Store InterventionHeaderStore
 * @const InterventionHeaderStore
 *
 * @description
 * Root-provided NgRx SignalStore bridging the intervention detail page and
 * the dashboard layout's page-header action slot. The page pushes its header
 * view state here (canonical phase action, review affordance, prev/next
 * navigation, overflow entries) and clears it on destroy; the slot component
 * renders from it and dispatches `interventionHeaderEvents` the page reacts
 * to — orchestration never leaves the page.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const InterventionHeaderStore = signalStore(
  { providedIn: 'root' },

  withState<InterventionHeaderState>(INITIAL_INTERVENTION_HEADER_STATE),

  withComputed((store) => ({
    /**
     * Computed hasActions.
     *
     * @description
     * Whether any header affordance is published; gates the slot component's
     * rendering so pages other than the intervention detail stay untouched.
     */
    hasActions: computed<boolean>(
      () =>
        store.commandAction() !== null ||
        store.canRequestChanges() ||
        store.showPrevNext() ||
        store.overflowItems().length > 0,
    ),
  })),

  withMethods((store) => ({
    /**
     * Method setHeader
     * @method setHeader
     *
     * @description
     * Publishes the detail page's current header view state to the slot.
     *
     * @access public
     * @since 1.0.0
     *
     * @param {InterventionHeaderState} header - Header view state to publish.
     *
     * @returns {void}
     */
    setHeader(header: InterventionHeaderState): void {
      patchState(store, header);
    },

    /**
     * Method clear
     * @method clear
     *
     * @description
     * Resets the store so the page-header slot renders nothing once the
     * detail page is destroyed.
     *
     * @access public
     * @since 1.0.0
     *
     * @returns {void}
     */
    clear(): void {
      patchState(store, INITIAL_INTERVENTION_HEADER_STATE);
    },
  })),
);

/**
 * Type InterventionHeaderStoreType
 *
 * @description
 * Instance type of the {@link InterventionHeaderStore}.
 */
export type InterventionHeaderStoreType = InstanceType<typeof InterventionHeaderStore>;
