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
import { lucideSearch, lucideUsers } from '@ng-icons/lucide';
import type { BrnDialogState } from '@spartan-ng/brain/dialog';
import type { MemberDirectoryEntry } from '@features/organization/models';
import { EmptyState } from '@shared/empty-state';
import { HlmAvatar, HlmAvatarFallback, HlmAvatarImage } from '@shared/ui/avatar';
import {
  HlmDialog,
  HlmDialogContent,
  HlmDialogHeader,
  HlmDialogPortal,
  HlmDialogTitle,
} from '@shared/ui/dialog';
import { HlmInput } from '@shared/ui/input';

/**
 * Component NewDirectMessageDialog
 * @class NewDirectMessageDialog
 *
 * @description
 * Picks the member to open a direct conversation with.
 *
 * Presentational: it filters and emits a member id, and the page decides what
 * that means (`ARCHITECTURE.md` §10.5). The candidate list is supplied already
 * filtered — the acting member is not in it, because the API refuses a
 * conversation with oneself.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-new-direct-message-dialog [visible]="pickerVisible()" [members]="candidates()" />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-new-direct-message-dialog',
  imports: [
    NgIcon,
    EmptyState,
    HlmAvatar,
    HlmAvatarFallback,
    HlmAvatarImage,
    HlmDialog,
    HlmDialogContent,
    HlmDialogHeader,
    HlmDialogPortal,
    HlmDialogTitle,
    HlmInput,
  ],
  providers: [provideIcons({ lucideSearch, lucideUsers })],
  templateUrl: './new-direct-message-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewDirectMessageDialog {
  //#region Inputs
  /**
   * Property visible
   * @readonly
   *
   * @description
   * Whether the picker is open.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly visible: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property members
   * @readonly
   *
   * @description
   * Who can be written to, excluding the acting member.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly MemberDirectoryEntry[]>}
   */
  public readonly members: InputSignal<readonly MemberDirectoryEntry[]> =
    input.required<readonly MemberDirectoryEntry[]>();

  /**
   * Property pending
   * @readonly
   *
   * @description
   * Whether a conversation is being opened, which locks the list against a
   * second pick.
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
   * Reports the picker opening or closing, including a dismissal.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<boolean>}
   */
  public readonly visibleChange: OutputEmitterRef<boolean> = output<boolean>();

  /**
   * Property selected
   * @readonly
   *
   * @description
   * Emits the bare member id to open a conversation with.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<string>}
   */
  public readonly selected: OutputEmitterRef<string> = output<string>();
  //#endregion

  //#region Properties
  /**
   * Property query
   * @readonly
   *
   * @description
   * What has been typed into the search field.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<string>}
   */
  protected readonly query: WritableSignal<string> = signal<string>('');

  /**
   * Property matches
   * @readonly
   *
   * @description
   * Candidates whose name contains the search text, in the order given.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly MemberDirectoryEntry[]>}
   */
  protected readonly matches: Signal<readonly MemberDirectoryEntry[]> = computed(
    (): readonly MemberDirectoryEntry[] => {
      const needle: string = this.query().trim().toLocaleLowerCase();

      if (needle.length === 0) return this.members();

      return this.members().filter((member: MemberDirectoryEntry): boolean =>
        member.displayName.toLocaleLowerCase().includes(needle),
      );
    },
  );

  /**
   * Property dialogState
   * @readonly
   *
   * @description
   * The overlay's own open/closed state, derived from {@link visible} so the
   * page stays the single owner of whether the picker is up.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<BrnDialogState>}
   */
  protected readonly dialogState: Signal<BrnDialogState> = computed((): BrnDialogState =>
    this.visible() ? 'open' : 'closed',
  );
  //#endregion

  //#region Methods
  /**
   * Method onStateChanged
   * @method onStateChanged
   *
   * @description
   * Reports a dismissal — escape, the backdrop, the close button — back to the
   * page, which owns the flag this is derived from. Ignored while a
   * conversation is being opened, matching the bound `disableClose`.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {BrnDialogState} state - The overlay's new state.
   *
   * @returns {void}
   */
  protected onStateChanged(state: BrnDialogState): void {
    if (this.pending()) return;

    const isOpen: boolean = state === 'open';

    if (isOpen === this.visible()) return;

    if (!isOpen) this.query.set('');

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
   * Method pick
   * @method pick
   *
   * @description
   * Emits the chosen member and closes the picker.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} memberId - Bare member id.
   *
   * @returns {void}
   */
  protected pick(memberId: string): void {
    if (this.pending()) return;

    this.selected.emit(memberId);
    this.query.set('');
    this.visibleChange.emit(false);
  }

  /**
   * Method initialsOf
   * @method initialsOf
   *
   * @description
   * Fallback shown while a candidate's avatar is missing or still loading.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} name - The candidate's name.
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
  //#endregion
}
