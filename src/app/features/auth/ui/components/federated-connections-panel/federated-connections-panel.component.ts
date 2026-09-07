import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCheck, lucideKeyRound, lucideLink, lucideUnlink } from '@ng-icons/lucide';
import type { BrnDialogState } from '@spartan-ng/brain/dialog';
import { FEDERATED_PROVIDER_ICONS } from '@features/auth/constants';
import type {
  FederatedConnectionOutput,
  FederatedConnectionsOutput,
  FederatedProvider,
} from '@features/auth/models';
import { HlmAlertDialogImports } from '@shared/ui/alert-dialog';
import { HlmButton } from '@shared/ui/button';
import { HlmSkeleton } from '@shared/ui/skeleton';

/**
 * Component FederatedConnectionsPanel
 * @class FederatedConnectionsPanel
 *
 * @description
 * Presentational list of password and external sign-in methods. The owning
 * page supplies state and handles every emitted mutation intent.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-federated-connections-panel',
  imports: [NgIcon, HlmButton, HlmSkeleton, ...HlmAlertDialogImports],
  providers: [
    provideIcons({
      lucideCheck,
      lucideKeyRound,
      lucideLink,
      lucideUnlink,
      ...FEDERATED_PROVIDER_ICONS,
    }),
  ],
  templateUrl: './federated-connections-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FederatedConnectionsPanel {
  /**
   * Property providers
   * @readonly
   * @description Providers available for connection or already connected.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly FederatedProvider[]>}
   */
  public readonly providers: InputSignal<readonly FederatedProvider[]> = input<
    readonly FederatedProvider[]
  >([]);
  /**
   * Property connections
   * @readonly
   * @description Current authenticated sign-in methods.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<FederatedConnectionsOutput | null>}
   */
  public readonly connections: InputSignal<FederatedConnectionsOutput | null> =
    input<FederatedConnectionsOutput | null>(null);

  /**
   * Property loading
   * @readonly
   *
   * @description Whether connections are loading.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly loading: InputSignal<boolean> = input(false);

  /**
   * Property pending
   * @readonly
   *
   * @description Whether a connection mutation is pending.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input(false);

  /**
   * Property pendingProvider
   * @readonly
   *
   * @description Provider owning the pending mutation.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<FederatedProvider | null>}
   */
  public readonly pendingProvider: InputSignal<FederatedProvider | null> =
    input<FederatedProvider | null>(null);

  /**
   * Property error
   * @readonly
   *
   * @description Current connection error for the inline retry state.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string | null>}
   */
  public readonly error: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property connectRequested
   * @readonly
   *
   * @description Emits the provider selected for connection.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<FederatedProvider>}
   */
  public readonly connectRequested: OutputEmitterRef<FederatedProvider> =
    output<FederatedProvider>();

  /**
   * Property disconnectRequested
   * @readonly
   *
   * @description Emits a confirmed provider removal.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<FederatedProvider>}
   */
  public readonly disconnectRequested: OutputEmitterRef<FederatedProvider> =
    output<FederatedProvider>();

  /**
   * Property passwordSetupRequested
   * @readonly
   *
   * @description Emits when the user requests a first local password.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<void>}
   */
  public readonly passwordSetupRequested: OutputEmitterRef<void> = output<void>();

  /**
   * Property retried
   * @readonly
   *
   * @description Emits when connection loading should be retried.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<void>}
   */
  public readonly retried: OutputEmitterRef<void> = output<void>();

  /**
   * Property disconnectingProvider
   * @readonly
   *
   * @description Provider selected in the removal dialog.
   * @access protected
   * @since 1.0.0
   * @type {WritableSignal<FederatedProvider | null>}
   */
  protected readonly disconnectingProvider: WritableSignal<FederatedProvider | null> = signal(null);

  /**
   * Property dialogState
   * @readonly
   *
   * @description Spartan dialog state derived from the selected provider.
   * @access protected
   * @since 1.0.0
   * @type {Signal<BrnDialogState>}
   */
  protected readonly dialogState: Signal<BrnDialogState> = computed(() =>
    this.disconnectingProvider() ? 'open' : 'closed',
  );

  /**
   * Property visibleProviders
   * @readonly
   *
   * @description Enabled providers plus existing connections kept visible for management.
   * @access protected
   * @since 1.0.0
   * @type {Signal<readonly FederatedProvider[]>}
   */
  protected readonly visibleProviders: Signal<readonly FederatedProvider[]> = computed(() => {
    const connected = this.connections()?.connections.map((item) => item.provider) ?? [];
    return (['google', 'microsoft'] as const).filter(
      (provider) => this.providers().includes(provider) || connected.includes(provider),
    );
  });

  /**
   * Method connection
   * @method connection
   * @description Finds connection details for one rendered provider row.
   * @access protected
   * @since 1.0.0
   * @param {FederatedProvider} provider - Provider represented by the row.
   * @returns {FederatedConnectionOutput | null} Matching connection when present.
   */
  protected connection(provider: FederatedProvider): FederatedConnectionOutput | null {
    return this.connections()?.connections.find((item) => item.provider === provider) ?? null;
  }

  /**
   * Method providerName
   * @method providerName
   * @description Returns the localized name used by the confirmation dialog.
   * @access protected
   * @since 1.0.0
   * @param {FederatedProvider} provider - Provider to label.
   * @returns {string} Localized provider name.
   */
  protected providerName(provider: FederatedProvider): string {
    return provider === 'google'
      ? $localize`:@@auth.federated.google:Google`
      : $localize`:@@auth.federated.microsoft:Microsoft`;
  }

  /**
   * Method requestDisconnect
   * @method requestDisconnect
   * @description Opens the confirmation dialog for the selected provider.
   * @access protected
   * @since 1.0.0
   * @param {FederatedProvider} provider - Provider selected for removal.
   * @returns {void}
   */
  protected requestDisconnect(provider: FederatedProvider): void {
    this.disconnectingProvider.set(provider);
  }

  /**
   * Method confirmDisconnect
   * @method confirmDisconnect
   * @description Emits the confirmed disconnect intent once per dialog action.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected confirmDisconnect(): void {
    const provider = this.disconnectingProvider();
    if (!provider || this.pending()) return;
    this.disconnectRequested.emit(provider);
    this.disconnectingProvider.set(null);
  }

  /**
   * Method onDialogStateChanged
   * @method onDialogStateChanged
   * @description Mirrors the Spartan dialog state into the selected provider signal.
   * @access protected
   * @since 1.0.0
   * @param {BrnDialogState} state - Latest dialog visibility state.
   * @returns {void}
   */
  protected onDialogStateChanged(state: BrnDialogState): void {
    if (state === 'closed') this.disconnectingProvider.set(null);
  }
}
