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
import { lucidePenLine, lucideSearch, lucideUsers } from '@ng-icons/lucide';
import { BrnCommandInput, type CommandFilter } from '@spartan-ng/brain/command';
import type { BrnDialogState } from '@spartan-ng/brain/dialog';
import type { MemberDirectoryEntry } from '@features/organization/models';
import { HlmAvatar, HlmAvatarFallback, HlmAvatarImage } from '@shared/ui/avatar';
import { HlmButton } from '@shared/ui/button';
import { HlmCommand, HlmCommandList, HlmCommandItem } from '@shared/ui/command';
import { HlmEmptyImports } from '@shared/ui/empty';
import { HlmInput } from '@shared/ui/input';
import { HlmPopoverImports } from '@shared/ui/popover';

/**
 * Component DirectMessagePicker
 * @class DirectMessagePicker
 *
 * @description
 * Picks a recipient in a searchable Spartan popover anchored to its compose button.
 * Native command items provide keyboard navigation without obscuring the conversation.
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
 * <app-direct-message-picker [visible]="pickerVisible()" [members]="candidates()" />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-direct-message-picker',
  imports: [
    NgIcon,
    ...HlmEmptyImports,
    HlmAvatar,
    HlmAvatarFallback,
    HlmAvatarImage,
    HlmPopoverImports,
    HlmButton,
    BrnCommandInput,
    HlmCommand,
    HlmCommandList,
    HlmCommandItem,
    HlmInput,
  ],
  providers: [provideIcons({ lucidePenLine, lucideSearch, lucideUsers })],
  templateUrl: './direct-message-picker.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DirectMessagePicker {
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
   * Property passThroughFilter
   * @readonly
   *
   * @description
   * Leaves candidate matching to the normalized name search so command navigation
   * does not apply a second filter with different whitespace handling.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {CommandFilter}
   */
  protected readonly passThroughFilter: CommandFilter = (): boolean => true;

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
   * Property popoverState
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
  protected readonly popoverState: Signal<BrnDialogState> = computed((): BrnDialogState =>
    this.visible() ? 'open' : 'closed',
  );
  //#endregion

  //#region Methods
  /**
   * Method onStateChanged
   * @method onStateChanged
   *
   * @description
   * Reports trigger activation or dismissal by Escape or an outside click.
   * The host owns visibility; closing clears the transient search.
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

    this.query.set('');

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
