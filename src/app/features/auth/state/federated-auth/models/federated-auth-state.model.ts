import type { CallState } from '@core/request-state';
import type {
  FederatedConnectionsOutput,
  FederatedProvider,
  FederatedProviderOutput,
  FederatedStartOutput,
  LoginOutput,
  PasswordSetupChallengeOutput,
  PasswordSetupConfirmOutput,
} from '@features/auth/models';

/**
 * Interface FederatedAuthState
 * @interface FederatedAuthState
 *
 * @description
 * Request and result state for all external sign-in workflows.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface FederatedAuthState {
  /**
   * Property providers
   * @readonly
   *
   * @description Public provider availability.
   * @access public
   * @since 1.0.0
   * @type {readonly FederatedProviderOutput[]}
   */
  readonly providers: readonly FederatedProviderOutput[];
  /**
   * Property connections
   * @readonly
   *
   * @description Current authenticated sign-in methods.
   * @access public
   * @since 1.0.0
   * @type {FederatedConnectionsOutput | null}
   */
  readonly connections: FederatedConnectionsOutput | null;
  /**
   * Property pendingProvider
   * @readonly
   *
   * @description Provider owning the active mutation.
   * @access public
   * @since 1.0.0
   * @type {FederatedProvider | null}
   */
  readonly pendingProvider: FederatedProvider | null;
  /**
   * Property providersCallState
   * @readonly
   *
   * @description Provider discovery request state.
   * @access public
   * @since 1.0.0
   * @type {CallState<readonly FederatedProviderOutput[]>}
   */
  readonly providersCallState: CallState<readonly FederatedProviderOutput[]>;
  /**
   * Property startCallState
   * @readonly
   *
   * @description Redirect start request state.
   * @access public
   * @since 1.0.0
   * @type {CallState<FederatedStartOutput>}
   */
  readonly startCallState: CallState<FederatedStartOutput>;
  /**
   * Property completeLoginCallState
   * @readonly
   *
   * @description Login callback completion state.
   * @access public
   * @since 1.0.0
   * @type {CallState<LoginOutput>}
   */
  readonly completeLoginCallState: CallState<LoginOutput>;
  /**
   * Property connectionsCallState
   * @readonly
   *
   * @description Current-connection query state.
   * @access public
   * @since 1.0.0
   * @type {CallState<FederatedConnectionsOutput>}
   */
  readonly connectionsCallState: CallState<FederatedConnectionsOutput>;
  /**
   * Property completeLinkCallState
   * @readonly
   *
   * @description Provider-link callback completion state.
   * @access public
   * @since 1.1.0
   * @type {CallState<FederatedConnectionsOutput>}
   */
  readonly completeLinkCallState: CallState<FederatedConnectionsOutput>;
  /**
   * Property disconnectCallState
   * @readonly
   *
   * @description Provider removal state.
   * @access public
   * @since 1.0.0
   * @type {CallState<FederatedConnectionsOutput>}
   */
  readonly disconnectCallState: CallState<FederatedConnectionsOutput>;
  /**
   * Property passwordSetupRequestCallState
   * @readonly
   *
   * @description First-password challenge request state.
   * @access public
   * @since 1.0.0
   * @type {CallState<PasswordSetupChallengeOutput>}
   */
  readonly passwordSetupRequestCallState: CallState<PasswordSetupChallengeOutput>;
  /**
   * Property passwordSetupConfirmCallState
   * @readonly
   *
   * @description First-password confirmation state.
   * @access public
   * @since 1.0.0
   * @type {CallState<PasswordSetupConfirmOutput>}
   */
  readonly passwordSetupConfirmCallState: CallState<PasswordSetupConfirmOutput>;
}
