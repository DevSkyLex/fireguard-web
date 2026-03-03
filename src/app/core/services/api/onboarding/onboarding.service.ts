import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { BaseApiService } from '../base-api.service';
import type {
  OnboardingOutput,
  StartOnboardingInput,
  OnboardingStepKey,
} from '@core/models/onboarding';

/**
 * Service OnboardingService
 * @class OnboardingService
 * @extends {BaseApiService}
 *
 * @description
 * API service for the organization onboarding flow.
 * Manages onboarding state retrieval, flow start, step execution,
 * step skipping, and rollback to a previous step.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Injectable({
  providedIn: 'root',
})
export class OnboardingService extends BaseApiService {
  //#region Properties
  /**
   * Property BASE_PATH
   * @readonly
   * @static
   *
   * @description
   * Base API path for organization onboarding endpoints.
   *
   * @access private
   * @since 1.0.0
   * @type {string}
   */
  private static readonly BASE_PATH: string = '/api/onboarding/organization';

  /**
   * Property ROLLBACK_ENDPOINT
   * @readonly
   * @static
   *
   * @description
   * Endpoint segment used to rollback the onboarding to the previous step.
   *
   * @access private
   * @since 1.0.0
   * @type {string}
   */
  private static readonly ROLLBACK_ENDPOINT: string = 'rollback';

  /**
   * Property STEP_ENDPOINT
   * @readonly
   * @static
   *
   * @description
   * Endpoint segment used to target a specific onboarding step.
   *
   * @access private
   * @since 1.0.0
   * @type {string}
   */
  private static readonly STEP_ENDPOINT: string = 'steps';

  /**
   * Property START_ENDPOINT
   * @readonly
   * @static
   *
   * @description
   * Endpoint segment used to start the onboarding flow.
   *
   * @access private
   * @since 1.0.0
   * @type {string}
   */
  private static readonly START_ENDPOINT: string = 'start';
  //#endregion

  //#region Public Methods
  /**
   * Method get
   * @method get
   *
   * @description
   * Retrieves the current onboarding state for the organization,
   * including the active step and overall progress.
   *
   * @access public
   * @since 1.0.0
   *
   * @return {Observable<OnboardingOutput>} An observable emitting the current onboarding details.
   */
  public get(): Observable<OnboardingOutput> {
    return this.getOne<OnboardingOutput>(OnboardingService.BASE_PATH);
  }

  /**
   * Method start
   * @method start
   *
   * @description
   * Initiates the onboarding flow for the organization.
   * Must be called before any step can be executed.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {StartOnboardingInput} input - Input data required to start the onboarding (e.g. organization name).
   *
   * @return {Observable<OnboardingOutput>} An observable emitting the initial onboarding state.
   */
  public start(input: StartOnboardingInput): Observable<OnboardingOutput> {
    return this.post<StartOnboardingInput, OnboardingOutput>(
      `${OnboardingService.BASE_PATH}/${OnboardingService.START_ENDPOINT}`,
      input,
    );
  }

  /**
   * Method executeStep
   * @method executeStep
   *
   * @description
   * Executes the specified onboarding step, marking it as completed
   * and advancing the onboarding flow to the next step.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {OnboardingStepKey} stepKey - The key identifying the step to execute.
   *
   * @return {Observable<OnboardingOutput>} An observable emitting the updated onboarding state after execution.
   */
  public executeStep(stepKey: OnboardingStepKey): Observable<OnboardingOutput> {
    return this.post<Record<string, never>, OnboardingOutput>(
      `${OnboardingService.BASE_PATH}/${OnboardingService.STEP_ENDPOINT}/${stepKey}/execute`,
      {},
    );
  }

  /**
   * Method skipStep
   * @method skipStep
   *
   * @description
   * Skips the specified onboarding step without completing it,
   * advancing the flow to the next step if possible.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {OnboardingStepKey} stepKey - The key identifying the step to skip.
   *
   * @return {Observable<OnboardingOutput>} An observable emitting the updated onboarding state after skipping.
   */
  public skipStep(stepKey: OnboardingStepKey): Observable<OnboardingOutput> {
    return this.postAction<OnboardingOutput>(
      `${OnboardingService.BASE_PATH}/${OnboardingService.STEP_ENDPOINT}/${stepKey}/skip`,
    );
  }

  /**
   * Method rollback
   * @method rollback
   *
   * @description
   * Rolls back the onboarding flow to the previous step,
   * allowing the user to revisit and modify earlier data.
   *
   * @access public
   * @since 1.0.0
   *
   * @return {Observable<OnboardingOutput>} An observable emitting the updated onboarding state after rollback.
   */
  public rollback(): Observable<OnboardingOutput> {
    return this.postAction<OnboardingOutput>(
      `${OnboardingService.BASE_PATH}/${OnboardingService.ROLLBACK_ENDPOINT}`,
    );
  }
  //#endregion
}
