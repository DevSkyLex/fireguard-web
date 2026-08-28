import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  PLATFORM_ID,
  signal,
  untracked,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { BrnDialogState } from '@spartan-ng/brain/dialog';
import { isApiError } from '@core/api/utils';
import { CalendarService } from '@features/organization/features/calendar/data-access';
import type {
  CalendarFeedTokenOutput,
  CalendarFeedTokenSecretOutput,
} from '@features/organization/features/calendar/models';
import {
  DEFAULT_REGIONAL_FORMAT_SETTINGS,
  OrgDatePipe,
  type RegionalFormatSettings,
} from '@shared/regional-format';
import { HlmButton } from '@shared/ui/button';
import { HlmDialogImports } from '@shared/ui/dialog';
import { HlmInput } from '@shared/ui/input';
import { HlmSpinner } from '@shared/ui/spinner';

/**
 * Type CalendarFeedTokenAction
 *
 * @description
 * The destructive action awaiting its in-dialog confirmation step —
 * regenerating kills the previous link before minting a new one, revoking
 * kills it outright.
 *
 * @since 1.0.0
 */
type CalendarFeedTokenAction = 'regenerate' | 'revoke';

/**
 * Component CalendarFeedSubscribeDialog
 * @class CalendarFeedSubscribeDialog
 *
 * @description
 * The "Subscribe (iCal)" dialog: the member's personal feed-token lifecycle
 * against `/organizations/{id}/calendar/feed-token`. Without a token it
 * explains the link and offers Generate; right after a generation it shows
 * the full feed URL exactly once — readonly field, Copy with an
 * `aria-live` "Copied" announcement, and the cannot-be-shown-again warning —
 * because the backend keeps only a hash; with an existing token it shows
 * `createdAt`/`lastUsedAt` (via `appOrgDate` and the caller-supplied
 * regional settings) plus Regenerate and Revoke, each behind an in-dialog
 * confirmation step. **Sanctioned deviation from §10.3, documented in
 * `FEATURE.md`**: this dialog injects `CalendarService` directly, mirroring
 * the §11.6 one-shot exception — every call is a fire-and-forget drain of
 * dialog-local ephemeral state (the secret above all must not outlive the
 * dialog), and routing it through the feed store would create `CallState`
 * fields no other view reads. Action buttons stay focusable while a call is
 * in flight: they signal `aria-disabled` and guard in the handler instead
 * of using `disabled`.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-calendar-feed-subscribe-dialog
 *   [visible]="feedSubscribeDialogVisible()"
 *   [organizationId]="organizationId()"
 *   [regionalFormatting]="regionalFormatting()"
 *   (visibleChange)="feedSubscribeDialogVisible.set($event)"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-calendar-feed-subscribe-dialog',
  imports: [...HlmDialogImports, HlmButton, HlmInput, HlmSpinner, OrgDatePipe],
  templateUrl: './calendar-feed-subscribe-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarFeedSubscribeDialog {
  //#region Inputs
  /**
   * Property visible
   * @readonly
   * @description Whether the dialog is open. Each opening reloads the token metadata and clears any previously shown secret.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly visible: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property organizationId
   * @readonly
   * @description The organization whose calendar the feed token exposes.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string>}
   */
  public readonly organizationId: InputSignal<string> = input.required<string>();

  /**
   * Property regionalFormatting
   * @readonly
   * @description The active organization's date pattern and timezone, read by the `appOrgDate` bindings on `createdAt`/`lastUsedAt`.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<RegionalFormatSettings>}
   */
  public readonly regionalFormatting: InputSignal<RegionalFormatSettings> =
    input<RegionalFormatSettings>(DEFAULT_REGIONAL_FORMAT_SETTINGS);
  //#endregion

  //#region Outputs
  /**
   * Property visibleChange
   * @readonly
   * @description Reports the dialog opening or closing, including a dismissal.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<boolean>}
   */
  public readonly visibleChange: OutputEmitterRef<boolean> = output<boolean>();
  //#endregion

  //#region Properties
  /** The feature's calendar transport — direct on purpose, see the class doc. */
  private readonly calendarService: CalendarService = inject<CalendarService>(CalendarService);

  private readonly platformId: object = inject(PLATFORM_ID);

  private readonly destroyRef: DestroyRef = inject(DestroyRef);

  /** Whether the opening metadata read is in flight. */
  protected readonly loading: WritableSignal<boolean> = signal<boolean>(false);

  /** Whether a generate/regenerate/revoke write is in flight. */
  protected readonly busy: WritableSignal<boolean> = signal<boolean>(false);

  /** The active token's secret-less metadata, `null` while the member holds none. */
  protected readonly metadata: WritableSignal<CalendarFeedTokenOutput | null> =
    signal<CalendarFeedTokenOutput | null>(null);

  /** The one-time secret payload of a generation done in this opening, `null` otherwise. */
  protected readonly secret: WritableSignal<CalendarFeedTokenSecretOutput | null> =
    signal<CalendarFeedTokenSecretOutput | null>(null);

  /** The last call's rejection, rendered inline; `null` when there is nothing to show. */
  protected readonly errorMessage: WritableSignal<string | null> = signal<string | null>(null);

  /** Whether the shown feed URL was copied — drives the Copy button's label and the live region. */
  protected readonly copied: WritableSignal<boolean> = signal<boolean>(false);

  /** The destructive action awaiting its confirmation step, `null` when none. */
  protected readonly confirming: WritableSignal<CalendarFeedTokenAction | null> =
    signal<CalendarFeedTokenAction | null>(null);

  /**
   * Property dialogState
   * @readonly
   * @description The overlay's own open/closed state, derived from {@link visible}.
   * @access protected
   * @since 1.0.0
   * @type {Signal<BrnDialogState>}
   */
  protected readonly dialogState: Signal<BrnDialogState> = computed((): BrnDialogState =>
    this.visible() ? 'open' : 'closed',
  );
  //#endregion

  //#region Constructor
  /**
   * Constructor
   *
   * @description
   * Resets the dialog's ephemeral state — the shown secret above all — and
   * reloads the token metadata on every opening.
   *
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    effect((): void => {
      const visible: boolean = this.visible();
      const organizationId: string = this.organizationId();

      untracked((): void => {
        if (!visible || !isPlatformBrowser(this.platformId)) return;

        this.secret.set(null);
        this.metadata.set(null);
        this.errorMessage.set(null);
        this.copied.set(false);
        this.confirming.set(null);
        this.loadMetadata(organizationId);
      });
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method onStateChanged
   * @method onStateChanged
   * @description Reports a dismissal — the backdrop or Escape — back to the host. Ignored while a call is in flight, matching the bound `disableClose`.
   * @access protected
   * @since 1.0.0
   * @param {BrnDialogState} state - The overlay's new state.
   * @returns {void}
   */
  protected onStateChanged(state: BrnDialogState): void {
    if (this.busy()) return;

    const isOpen: boolean = state === 'open';

    if (isOpen === this.visible()) return;

    this.visibleChange.emit(isOpen);
  }

  /**
   * Method close
   * @method close
   * @description The footer Close button — ignored while a call is in flight.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected close(): void {
    if (this.busy()) return;

    this.visibleChange.emit(false);
  }

  /**
   * Method generate
   * @method generate
   * @description The no-token state's Generate button: mints the token and swaps to the one-time secret view.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected generate(): void {
    if (this.busy() || this.loading()) return;

    this.createToken();
  }

  /**
   * Method requestAction
   * @method requestAction
   * @description Arms the in-dialog confirmation step for Regenerate or Revoke.
   * @access protected
   * @since 1.0.0
   * @param {CalendarFeedTokenAction} action - The destructive action to confirm.
   * @returns {void}
   */
  protected requestAction(action: CalendarFeedTokenAction): void {
    if (this.busy()) return;

    this.errorMessage.set(null);
    this.confirming.set(action);
  }

  /**
   * Method cancelAction
   * @method cancelAction
   * @description Disarms the confirmation step without acting.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected cancelAction(): void {
    if (this.busy()) return;

    this.confirming.set(null);
  }

  /**
   * Method confirmAction
   * @method confirmAction
   * @description Runs the armed destructive action — the rotate-on-create for Regenerate, the DELETE for Revoke.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected confirmAction(): void {
    if (this.busy()) return;

    const action: CalendarFeedTokenAction | null = this.confirming();
    if (action === 'regenerate') this.createToken();
    if (action === 'revoke') this.revokeToken();
  }

  /**
   * Method copyFeedUrl
   * @method copyFeedUrl
   * @description Copies the one-time feed URL to the clipboard and announces "Copied" through the live region.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected copyFeedUrl(): void {
    const feedUrl: string | undefined = this.secret()?.feedUrl;
    if (!feedUrl || !isPlatformBrowser(this.platformId)) return;

    void navigator.clipboard.writeText(feedUrl).then((): void => this.copied.set(true));
  }

  /**
   * Method loadMetadata
   * @method loadMetadata
   * @description Reads the active token's metadata; a 404 is the no-token state, not an error.
   * @access private
   * @since 1.0.0
   * @param {string} organizationId - The organization to read.
   * @returns {void}
   */
  private loadMetadata(organizationId: string): void {
    this.loading.set(true);

    this.calendarService
      .getFeedTokenMetadata(organizationId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (metadata: CalendarFeedTokenOutput): void => {
          this.metadata.set(metadata);
          this.loading.set(false);
        },
        error: (error: unknown): void => {
          this.loading.set(false);
          if (isApiError(error) && error.status === 404) return;

          this.errorMessage.set(
            $localize`:@@calendar.feedSubscribe.loadError:The subscription status could not be loaded. Close the dialog and try again.`,
          );
        },
      });
  }

  /**
   * Method createToken
   * @method createToken
   * @description The create/rotate write behind Generate and a confirmed Regenerate.
   * @access private
   * @since 1.0.0
   * @returns {void}
   */
  private createToken(): void {
    this.busy.set(true);
    this.errorMessage.set(null);

    this.calendarService
      .createFeedToken(this.organizationId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (secret: CalendarFeedTokenSecretOutput): void => {
          this.secret.set(secret);
          this.metadata.set(null);
          this.confirming.set(null);
          this.copied.set(false);
          this.busy.set(false);
        },
        error: (): void => {
          this.busy.set(false);
          this.errorMessage.set(
            $localize`:@@calendar.feedSubscribe.generateError:The link could not be generated. Try again.`,
          );
        },
      });
  }

  /**
   * Method revokeToken
   * @method revokeToken
   * @description The confirmed Revoke's DELETE — success returns the dialog to the no-token state.
   * @access private
   * @since 1.0.0
   * @returns {void}
   */
  private revokeToken(): void {
    this.busy.set(true);
    this.errorMessage.set(null);

    this.calendarService
      .revokeFeedToken(this.organizationId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (): void => {
          this.metadata.set(null);
          this.secret.set(null);
          this.confirming.set(null);
          this.busy.set(false);
        },
        error: (): void => {
          this.busy.set(false);
          this.errorMessage.set(
            $localize`:@@calendar.feedSubscribe.revokeError:The link could not be revoked. Try again.`,
          );
        },
      });
  }
  //#endregion
}
