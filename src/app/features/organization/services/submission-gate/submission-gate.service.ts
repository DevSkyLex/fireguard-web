import { computed, effect, Service, signal, untracked } from '@angular/core';
import type { Signal, WritableSignal } from '@angular/core';
import { isCallPending, isCallSuccess } from '@core/request-state';
import type { CallState, StoreError } from '@core/request-state';
import type { SubmissionGate, SubmissionGateOptions } from './models';

/**
 * Service SubmissionGateService
 * @class SubmissionGateService
 *
 * @description
 * Builds the attribution gate a surface needs when its store multiplexes
 * several mutations through one shared `CallState` — without it, a failure
 * from an earlier or sibling write leaks into whichever dialog is open next.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Service()
export class SubmissionGateService {
  //#region Methods
  /**
   * Method create
   * @method create
   *
   * @description
   * Opens a gate over the given call state. Must be called from an injection
   * context — the success watcher it installs lives as long as the caller
   * does.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {Signal<CallState<unknown, StoreError>>} callState - The shared mutation state to claim results from.
   * @param {SubmissionGateOptions} [options] - What to run when the claimed write succeeds.
   *
   * @returns {SubmissionGate} The surface's gate.
   */
  public create(
    callState: Signal<CallState<unknown, StoreError>>,
    options?: SubmissionGateOptions,
  ): SubmissionGate {
    const submitted: WritableSignal<boolean> = signal<boolean>(false);

    effect((): void => {
      const isSubmitted: boolean = submitted();
      const succeeded: boolean = isCallSuccess(callState());

      untracked((): void => {
        if (!isSubmitted || !succeeded) return;

        submitted.set(false);
        options?.onSuccess?.();
      });
    });

    return {
      isSubmitted: submitted.asReadonly(),
      isBusy: computed<boolean>(() => submitted() && isCallPending(callState())),
      error: computed<StoreError | null>(() => (submitted() ? callState().error : null)),
      submit: (): void => submitted.set(true),
      reset: (): void => submitted.set(false),
    };
  }
  //#endregion
}
