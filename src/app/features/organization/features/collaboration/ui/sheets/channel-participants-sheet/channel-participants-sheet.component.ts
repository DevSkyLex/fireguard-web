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
import { lucideUserMinus, lucideUserPlus, lucideUsers } from '@ng-icons/lucide';
import type { BrnDialogState } from '@spartan-ng/brain/dialog';
import type { MemberDirectoryEntry } from '@features/organization/models';
import { EmptyState } from '@shared/empty-state';
import { HlmAvatar, HlmAvatarFallback, HlmAvatarImage } from '@shared/ui/avatar';
import { HlmButton } from '@shared/ui/button';
import { HlmInput } from '@shared/ui/input';
import { HlmSheetImports } from '@shared/ui/sheet';
import { HlmSkeleton } from '@shared/ui/skeleton';
import type { ChannelParticipantView } from './models';

/**
 * Component ChannelParticipantsSheet
 * @class ChannelParticipantsSheet
 *
 * @description
 * The channel's roster: who is in it, and — for a member holding
 * `organization.messaging.manage` — a way to add or remove someone.
 *
 * Presentational: it renders {@link participants} and {@link candidates}
 * exactly as supplied and emits {@link added} / {@link removed}; the page
 * owns `ChannelParticipantsStore` and the member directory
 * (`ARCHITECTURE.md` §10.5). A reader without `.manage` still opens the
 * sheet to see who is in the channel — only the add/remove controls are
 * withheld, per {@link canManage} — rather than the sheet being unreachable.
 *
 * Removing a member asks once more before emitting: the row's action swaps
 * to "Confirm" / "Cancel" in place instead of opening a second overlay
 * nested inside this one, which spartan's dialog primitives do not support
 * cleanly.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-channel-participants-sheet
 *   [visible]="participantsSheetVisible()"
 *   [participants]="participantViews()"
 *   [candidates]="addableMembers()"
 *   [canManage]="canManage()"
 *   (added)="addParticipant($event)"
 *   (removed)="removeParticipant($event)"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-channel-participants-sheet',
  imports: [
    NgIcon,
    EmptyState,
    HlmAvatar,
    HlmAvatarFallback,
    HlmAvatarImage,
    HlmButton,
    HlmInput,
    HlmSkeleton,
    ...HlmSheetImports,
  ],
  providers: [provideIcons({ lucideUserMinus, lucideUserPlus, lucideUsers })],
  templateUrl: './channel-participants-sheet.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChannelParticipantsSheet {
  //#region Inputs
  /**
   * Property visible
   * @readonly
   * @description Whether the sheet is open. Owned by the page.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly visible: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property participants
   * @readonly
   * @description The channel's roster, each member already resolved to a name and a face.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly ChannelParticipantView[]>}
   */
  public readonly participants: InputSignal<readonly ChannelParticipantView[]> = input<
    readonly ChannelParticipantView[]
  >([]);

  /**
   * Property candidates
   * @readonly
   * @description Organization members who are not yet in the channel, offered for adding.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly MemberDirectoryEntry[]>}
   */
  public readonly candidates: InputSignal<readonly MemberDirectoryEntry[]> = input<
    readonly MemberDirectoryEntry[]
  >([]);

  /**
   * Property canManage
   * @readonly
   * @description Whether the reader holds `organization.messaging.manage`, which gates add and remove.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly canManage: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property loading
   * @readonly
   * @description Whether the roster is still being read.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly loading: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property pending
   * @readonly
   * @description Whether an add or a remove is in flight, which locks the controls.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Outputs
  /**
   * Property visibleChange
   * @readonly
   * @description The sheet wants to open or close.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<boolean>}
   */
  public readonly visibleChange: OutputEmitterRef<boolean> = output<boolean>();

  /**
   * Property added
   * @readonly
   * @description Emits the bare member id to add.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<string>}
   */
  public readonly added: OutputEmitterRef<string> = output<string>();

  /**
   * Property removed
   * @readonly
   * @description Emits the bare member id to remove, once confirmed.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<string>}
   */
  public readonly removed: OutputEmitterRef<string> = output<string>();
  //#endregion

  //#region Properties
  /**
   * Property query
   * @readonly
   * @description What has been typed into the add-candidate search field.
   * @access protected
   * @since 1.0.0
   * @type {WritableSignal<string>}
   */
  protected readonly query: WritableSignal<string> = signal<string>('');

  /**
   * Property matches
   * @readonly
   * @description Candidates whose name contains the search text, in the order given.
   * @access protected
   * @since 1.0.0
   * @type {Signal<readonly MemberDirectoryEntry[]>}
   */
  protected readonly matches: Signal<readonly MemberDirectoryEntry[]> = computed(
    (): readonly MemberDirectoryEntry[] => {
      const needle: string = this.query().trim().toLocaleLowerCase();

      if (needle.length === 0) return this.candidates();

      return this.candidates().filter((member: MemberDirectoryEntry): boolean =>
        member.displayName.toLocaleLowerCase().includes(needle),
      );
    },
  );

  /**
   * Property pendingRemoval
   * @readonly
   * @description The member id a remove is being confirmed for, or `null`.
   * @access protected
   * @since 1.0.0
   * @type {WritableSignal<string | null>}
   */
  protected readonly pendingRemoval: WritableSignal<string | null> = signal<string | null>(null);

  /**
   * Property sheetState
   * @readonly
   * @description The panel state, derived from {@link visible} so there is no second copy of the truth.
   * @access protected
   * @since 1.0.0
   * @type {Signal<BrnDialogState>}
   */
  protected readonly sheetState: Signal<BrnDialogState> = computed<BrnDialogState>(() =>
    this.visible() ? 'open' : 'closed',
  );
  //#endregion

  //#region Methods
  /**
   * Method onStateChanged
   * @method onStateChanged
   *
   * @description
   * Relays a dismissal, ignoring the echo of a change the page already made,
   * and clears any confirmation left mid-flight.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {BrnDialogState} state - The panel's new state.
   *
   * @returns {void}
   */
  protected onStateChanged(state: BrnDialogState): void {
    const isOpen: boolean = state === 'open';

    if (isOpen === this.visible()) return;

    if (!isOpen) {
      this.query.set('');
      this.pendingRemoval.set(null);
    }

    this.visibleChange.emit(isOpen);
  }

  /**
   * Method onQueryInput
   * @method onQueryInput
   *
   * @description
   * Keeps the search text in sync with the field.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {Event} event - The input event.
   *
   * @returns {void}
   */
  protected onQueryInput(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  /**
   * Method add
   * @method add
   *
   * @description
   * Emits the chosen candidate and clears the search.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} memberId - Bare member id.
   *
   * @returns {void}
   */
  protected add(memberId: string): void {
    if (this.pending()) return;

    this.added.emit(memberId);
    this.query.set('');
  }

  /**
   * Method requestRemoval
   * @method requestRemoval
   *
   * @description
   * Opens the in-place confirmation for one row.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} memberId - Bare member id.
   *
   * @returns {void}
   */
  protected requestRemoval(memberId: string): void {
    this.pendingRemoval.set(memberId);
  }

  /**
   * Method confirmRemoval
   * @method confirmRemoval
   *
   * @description
   * Emits the confirmed removal and closes the in-place confirmation.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} memberId - Bare member id.
   *
   * @returns {void}
   */
  protected confirmRemoval(memberId: string): void {
    this.pendingRemoval.set(null);
    this.removed.emit(memberId);
  }

  /**
   * Method initialsOf
   * @method initialsOf
   *
   * @description
   * Fallback shown while a member's avatar is missing or still loading.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} name - The member's resolved name.
   *
   * @returns {string} Up to two uppercase initials.
   */
  protected initialsOf(name: string): string {
    return name
      .split(/\s+/)
      .filter((part: string): boolean => part.length > 0)
      .slice(0, 2)
      .map((part: string): string => part[0]?.toUpperCase() ?? '')
      .join('');
  }

  /**
   * Method removeLabelFor
   * @method removeLabelFor
   *
   * @description
   * The accessible name for a row's remove control, naming the member since
   * the button itself carries only an icon.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} name - The participant's resolved name.
   *
   * @returns {string} A sentence naming who the control removes.
   */
  protected removeLabelFor(name: string): string {
    return $localize`:@@channels.participants.removeAria:Remove ${name}:name:`;
  }
  //#endregion
}
