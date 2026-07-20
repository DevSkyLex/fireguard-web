import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  model,
  output,
  signal,
  type InputSignal,
  type ModelSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import type { MemberIdentity } from '@features/organization/state';

/**
 * Component NewDirectConversationDialog
 * @class NewDirectConversationDialog
 *
 * @description
 * Picks the member to write to. The endpoint behind it is get-or-create, so
 * choosing someone already spoken to reopens the existing thread rather than
 * creating a second one.
 *
 * Presentational: the parent supplies the directory (already stripped of the
 * acting member), performs the call, and closes the dialog on success.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-new-direct-conversation-dialog',
  imports: [ButtonModule, DialogModule],
  templateUrl: './new-direct-conversation-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewDirectConversationDialog {
  //#region Properties
  /**
   * Property visible
   *
   * @description
   * Two-way open state, so the dialog's own dismiss reaches the parent.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {ModelSignal<boolean>}
   */
  public readonly visible: ModelSignal<boolean> = model<boolean>(false);

  /**
   * Property members
   * @readonly
   *
   * @description
   * Who can be written to. The parent removes the acting member: a direct
   * conversation with oneself is not a thing.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly MemberIdentity[]>}
   */
  public readonly members: InputSignal<readonly MemberIdentity[]> = input<
    readonly MemberIdentity[]
  >([]);

  /**
   * Property loading
   * @readonly
   *
   * @description
   * Whether the directory is still being fetched, as opposed to genuinely
   * empty — the two must not look alike.
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
   * Whether the open call is in flight.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property submitted
   * @readonly
   *
   * @description
   * The chosen member's id.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<string>}
   */
  public readonly submitted: OutputEmitterRef<string> = output<string>();

  /**
   * Property search
   * @readonly
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<string>}
   */
  protected readonly search: WritableSignal<string> = signal<string>('');

  /**
   * Property matches
   * @readonly
   *
   * @description
   * Members whose display name contains the search text.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly MemberIdentity[]>}
   */
  protected readonly matches: Signal<readonly MemberIdentity[]> = computed(
    (): readonly MemberIdentity[] => {
      const needle: string = this.search().trim().toLowerCase();
      if (needle.length === 0) return this.members();

      return this.members().filter((member: MemberIdentity): boolean =>
        member.displayName.toLowerCase().includes(needle),
      );
    },
  );
  //#endregion

  //#region Methods
  /**
   * Method pick
   *
   * @description
   * Chooses a member. The parent closes the dialog once the call succeeds, so
   * a failure keeps the list open.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {MemberIdentity} member - The member to write to.
   *
   * @returns {void}
   */
  protected pick(member: MemberIdentity): void {
    if (this.pending()) return;

    this.submitted.emit(member.id);
  }

  /**
   * Method reset
   *
   * @description
   * Clears the search when the dialog closes, so reopening starts fresh.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected reset(): void {
    this.search.set('');
  }
  //#endregion
}
