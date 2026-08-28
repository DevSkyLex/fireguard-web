import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  LOCALE_ID,
  output,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucidePin, lucidePinOff, lucideUsers } from '@ng-icons/lucide';
import type { BrnDialogState } from '@spartan-ng/brain/dialog';
import { EmptyState } from '@shared/empty-state';
import { sheetSide } from '@shared/sheet-side';
import { HlmAvatar, HlmAvatarFallback, HlmAvatarImage } from '@shared/ui/avatar';
import { HlmButton } from '@shared/ui/button';
import { HlmSheetImports } from '@shared/ui/sheet';
import { HlmSkeleton } from '@shared/ui/skeleton';
import type { ChannelParticipantView } from '../channel-participants-sheet';
import type { PinnedMessageItem } from './models';

/**
 * Component ChannelInfoSheet
 * @class ChannelInfoSheet
 *
 * @description
 * The channel's info panel: its name, its member roster, and its pinned
 * messages with an inline unpin. A sheet from the channel header, like the
 * participants sheet beside it — the roster here is read-only; managing it
 * stays in that dedicated sheet.
 *
 * There is no description here because the API's `ChannelOutput` carries
 * none — do not invent a field the contract does not have.
 *
 * Presentational: the page owns the pinned store and hears {@link unpinned}.
 * Each unpin control exists only where the server would allow it — the
 * pinning member or a manager — because a control the server will refuse is
 * worse than none.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-channel-info-sheet
 *   [visible]="infoSheetVisible()"
 *   [channelName]="channelName()"
 *   [participants]="participantViews()"
 *   [pinned]="pinnedItems()"
 *   [loading]="pinnedStore.isLoading()"
 *   [pending]="pinnedStore.isUnpinning()"
 *   (visibleChange)="infoSheetVisible.set($event)"
 *   (unpinned)="unpinFromSheet($event)"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-channel-info-sheet',
  imports: [
    NgIcon,
    EmptyState,
    HlmAvatar,
    HlmAvatarFallback,
    HlmAvatarImage,
    HlmButton,
    HlmSkeleton,
    ...HlmSheetImports,
  ],
  providers: [provideIcons({ lucidePin, lucidePinOff, lucideUsers })],
  templateUrl: './channel-info-sheet.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChannelInfoSheet {
  //#region Inputs
  /**
   * Property visible
   * @readonly
   *
   * @description
   * Whether the sheet is open.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly visible: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property channelName
   * @readonly
   *
   * @description
   * The channel's name, shown as the sheet's title.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly channelName: InputSignal<string> = input<string>('');

  /**
   * Property participants
   * @readonly
   *
   * @description
   * The channel's roster, resolved by the page — the same views the
   * participants sheet draws.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly ChannelParticipantView[]>}
   */
  public readonly participants: InputSignal<readonly ChannelParticipantView[]> = input<
    readonly ChannelParticipantView[]
  >([]);

  /**
   * Property pinned
   * @readonly
   *
   * @description
   * The channel's pinned messages, rendered by the page.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly PinnedMessageItem[]>}
   */
  public readonly pinned: InputSignal<readonly PinnedMessageItem[]> = input<
    readonly PinnedMessageItem[]
  >([]);

  /**
   * Property loading
   * @readonly
   *
   * @description
   * Whether the pinned list is still on its way.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly loading: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property pending
   * @readonly
   *
   * @description
   * Whether an unpin is in flight, disabling every unpin control for the
   * duration.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Outputs
  /**
   * Property visibleChange
   * @readonly
   *
   * @description
   * Reports the sheet opening or closing, including a dismissal.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<boolean>}
   */
  public readonly visibleChange: OutputEmitterRef<boolean> = output<boolean>();

  /**
   * Property unpinned
   * @readonly
   *
   * @description
   * Emits the message id whose pin the reader withdrew.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<string>}
   */
  public readonly unpinned: OutputEmitterRef<string> = output<string>();
  //#endregion

  //#region Properties
  /**
   * Property sheetState
   * @readonly
   * @description The overlay's own open/closed state, derived from {@link visible}.
   * @access protected
   * @since 1.0.0
   * @type {Signal<BrnDialogState>}
   */
  protected readonly sheetState: Signal<BrnDialogState> = computed((): BrnDialogState =>
    this.visible() ? 'open' : 'closed',
  );

  /**
   * Property side
   * @readonly
   * @description Right-anchored on desktop, a bottom drawer under `sm`.
   * @access protected
   * @since 1.0.0
   * @type {Signal<'right' | 'bottom'>}
   */
  protected readonly side: Signal<'right' | 'bottom'> = sheetSide();

  /**
   * Property deletedLabel
   * @readonly
   *
   * @description
   * Stands in for a tombstoned pinned body, which the API redacts.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {string}
   */
  protected readonly deletedLabel: string = $localize`:@@messages.row.deleted:This message was deleted`;

  /**
   * Property locale
   * @readonly
   *
   * @description
   * Active locale, used to date each pinned message.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {string}
   */
  private readonly locale: string = inject<string>(LOCALE_ID);
  //#endregion

  //#region Methods
  /**
   * Method onStateChanged
   * @method onStateChanged
   *
   * @description
   * Reports a dismissal back to the page, which owns the flag this is
   * derived from.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {BrnDialogState} state - The overlay's new state.
   *
   * @returns {void}
   */
  protected onStateChanged(state: BrnDialogState): void {
    const isOpen: boolean = state === 'open';

    if (isOpen === this.visible()) return;

    this.visibleChange.emit(isOpen);
  }

  /**
   * Method initialsOf
   * @method initialsOf
   *
   * @description
   * Fallback shown while a roster avatar is missing.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} displayName - The resolved name.
   *
   * @returns {string} Up to two initials.
   */
  protected initialsOf(displayName: string): string {
    return displayName
      .split(/\s+/)
      .filter((part: string): boolean => part.length > 0)
      .slice(0, 2)
      .map((part: string): string => part[0]?.toUpperCase() ?? '')
      .join('');
  }

  /**
   * Method dateOf
   * @method dateOf
   *
   * @description
   * A pinned message's date and time in the active locale.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} instant - ISO instant.
   *
   * @returns {string} A short localized date-time, or nothing when unparsable.
   */
  protected dateOf(instant: string): string {
    const parsed: number = Date.parse(instant);

    if (Number.isNaN(parsed)) return '';

    return new Intl.DateTimeFormat(this.locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(parsed);
  }
  //#endregion
}
