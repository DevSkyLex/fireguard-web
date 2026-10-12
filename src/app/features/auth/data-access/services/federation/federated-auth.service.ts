import { Service } from '@angular/core';
import type { Observable } from 'rxjs';
import { HydraApiService } from '@core/api';
import type { ApiRequestOptions, HydraCollection } from '@core/api/models';
import type {
  FederatedCompleteInput,
  FederatedConnectionsOutput,
  FederatedProvider,
  FederatedProviderOutput,
  FederatedStartInput,
  FederatedStartOutput,
  LoginOutput,
  PasswordSetupChallengeOutput,
  PasswordSetupConfirmInput,
  PasswordSetupConfirmOutput,
} from '@features/auth/models';

/**
 * Service FederatedAuthService
 * @class FederatedAuthService
 *
 * @description
 * Transport boundary for external sign-in providers, connected methods and
 * first-password setup.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @extends {HydraApiService}
 */
@Service()
export class FederatedAuthService extends HydraApiService {
  /**
   * Property BASE_PATH
   * @readonly
   * @static
   *
   * @description
   * Base path shared by all federated authentication endpoints.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {string}
   */
  private static readonly BASE_PATH: string = '/api/auth/federated';

  /**
   * Method providers
   * @method providers
   *
   * @description
   * Lists providers whose server-side configuration is complete and enabled.
   *
   * @access public
   * @since 1.0.0
   *
   * @returns {Observable<HydraCollection<FederatedProviderOutput>>} Available providers.
   */
  public providers(): Observable<HydraCollection<FederatedProviderOutput>> {
    return this.getCollection<FederatedProviderOutput>(
      `${FederatedAuthService.BASE_PATH}/providers`,
    );
  }

  /**
   * Method startLogin
   * @method startLogin
   *
   * @description
   * Creates a short-lived PKCE sign-in flow and returns its provider URL.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {FederatedProvider} provider - Provider selected by the user.
   * @param {FederatedStartInput} input - Safe local destination after sign-in.
   * @param {ApiRequestOptions} options - Transport identity retained for the same immutable write
   *   intent.
   *
   * @returns {Observable<FederatedStartOutput>} Provider authorization URL.
   */
  public startLogin(
    provider: FederatedProvider,
    input: FederatedStartInput,
    options?: ApiRequestOptions,
  ): Observable<FederatedStartOutput> {
    return this.post<FederatedStartInput, FederatedStartOutput>(
      `${FederatedAuthService.BASE_PATH}/${provider}/start`,
      input,
      options,
    );
  }

  /**
   * Method completeLogin
   * @method completeLogin
   *
   * @description
   * Exchanges a provider callback for the existing Fireguard login contract.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {FederatedProvider} provider - Provider that returned the callback.
   * @param {FederatedCompleteInput} input - One-time callback values.
   * @param {ApiRequestOptions} options - Transport identity retained for the same immutable write
   *   intent.
   *
   * @returns {Observable<LoginOutput>} Existing session and MFA outcome.
   */
  public completeLogin(
    provider: FederatedProvider,
    input: FederatedCompleteInput,
    options?: ApiRequestOptions,
  ): Observable<LoginOutput> {
    return this.post<FederatedCompleteInput, LoginOutput>(
      `${FederatedAuthService.BASE_PATH}/${provider}/complete`,
      input,
      options,
    );
  }

  /**
   * Method connections
   * @method connections
   *
   * @description
   * Reads the authenticated user's local and federated sign-in methods.
   *
   * @access public
   * @since 1.0.0
   *
   * @returns {Observable<FederatedConnectionsOutput>} Current sign-in methods.
   */
  public connections(): Observable<FederatedConnectionsOutput> {
    return this.getOne<FederatedConnectionsOutput>(`${FederatedAuthService.BASE_PATH}/connections`);
  }

  /**
   * Method startLink
   * @method startLink
   *
   * @description
   * Creates a provider-linking flow bound to the authenticated user.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {FederatedProvider} provider - Provider to connect.
   * @param {ApiRequestOptions} options - Transport identity retained for the same immutable write
   *   intent.
   *
   * @returns {Observable<FederatedStartOutput>} Provider authorization URL.
   */
  public startLink(
    provider: FederatedProvider,
    options?: ApiRequestOptions,
  ): Observable<FederatedStartOutput> {
    return this.post<FederatedStartInput, FederatedStartOutput>(
      `${FederatedAuthService.BASE_PATH}/connections/${provider}/start`,
      { return_url: '/account/security' },
      options,
    );
  }

  /**
   * Method completeLink
   * @method completeLink
   *
   * @description
   * Completes an authenticated provider link and returns the updated method set.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {FederatedProvider} provider - Provider that returned the callback.
   * @param {FederatedCompleteInput} input - One-time callback values.
   * @param {ApiRequestOptions} options - Transport identity retained for the same immutable write
   *   intent.
   *
   * @returns {Observable<FederatedConnectionsOutput>} Updated sign-in methods.
   */
  public completeLink(
    provider: FederatedProvider,
    input: FederatedCompleteInput,
    options?: ApiRequestOptions,
  ): Observable<FederatedConnectionsOutput> {
    return this.post<FederatedCompleteInput, FederatedConnectionsOutput>(
      `${FederatedAuthService.BASE_PATH}/connections/${provider}/complete`,
      input,
      options,
    );
  }

  /**
   * Method disconnect
   * @method disconnect
   *
   * @description
   * Removes one provider when another usable sign-in method remains.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {FederatedProvider} provider - Provider to disconnect.
   * @param {ApiRequestOptions} options - Transport identity retained for the same immutable write
   *   intent.
   *
   * @returns {Observable<FederatedConnectionsOutput>} Updated sign-in methods.
   */
  public disconnect(
    provider: FederatedProvider,
    options?: ApiRequestOptions,
  ): Observable<FederatedConnectionsOutput> {
    return this.deleteOne<FederatedConnectionsOutput>(
      `${FederatedAuthService.BASE_PATH}/connections/${provider}`,
      options,
    );
  }

  /**
   * Method requestPasswordSetup
   * @method requestPasswordSetup
   *
   * @description
   * Requests the email challenge used to configure a first local password.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {ApiRequestOptions} options - Transport identity retained for the same immutable write
   *   intent.
   *
   * @returns {Observable<PasswordSetupChallengeOutput>} Created OTP challenge.
   */
  public requestPasswordSetup(
    options?: ApiRequestOptions,
  ): Observable<PasswordSetupChallengeOutput> {
    return this.postAction<PasswordSetupChallengeOutput>('/api/auth/password/setup', options);
  }

  /**
   * Method confirmPasswordSetup
   * @method confirmPasswordSetup
   *
   * @description
   * Verifies the email challenge and configures the first local password.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {PasswordSetupConfirmInput} input - Challenge, code and new password.
   * @param {ApiRequestOptions} options - Transport identity retained for the same immutable write
   *   intent.
   *
   * @returns {Observable<PasswordSetupConfirmOutput>} Password setup outcome.
   */
  public confirmPasswordSetup(
    input: PasswordSetupConfirmInput,
    options?: ApiRequestOptions,
  ): Observable<PasswordSetupConfirmOutput> {
    return this.post<PasswordSetupConfirmInput, PasswordSetupConfirmOutput>(
      '/api/auth/password/setup/confirm',
      input,
      options,
    );
  }
}
