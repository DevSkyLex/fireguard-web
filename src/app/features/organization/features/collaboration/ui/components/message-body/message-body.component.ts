import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  type InputSignal,
  type Signal,
} from '@angular/core';
import type { MessageBodySegment } from '@features/organization/features/collaboration/models';
import { tokenizeMessageBody } from '@features/organization/features/collaboration/utils';

/**
 * Component MessageBody
 * @class MessageBody
 *
 * @description
 * Renders a message body, turning inline `@{memberUuid}` markers into mention
 * chips and leaving the surrounding sanitized HTML intact.
 *
 * Purely presentational: it resolves a mention's display name from the map it
 * is given rather than looking anyone up. Member IRIs are not dereferenceable
 * on this API, so name resolution belongs to whoever owns the directory.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-message-body [body]="message.body" [memberNames]="names()" />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-message-body',
  imports: [],
  templateUrl: './message-body.component.html',
  host: {
    class:
      'block max-w-[64ch] text-base leading-normal wrap-anywhere text-pretty text-surface-900 dark:text-surface-100',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessageBody {
  //#region Inputs
  /**
   * Property body
   * @readonly
   *
   * @description
   * Server-sanitized message body. Absent on a tombstone.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly body: InputSignal<string | undefined> = input<string | undefined>(undefined);

  /**
   * Property memberNames
   * @readonly
   *
   * @description
   * Display names by member id, used to label mention chips. An unknown id
   * falls back to a neutral label rather than exposing the raw UUID.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<Readonly<Record<string, string>>>}
   */
  public readonly memberNames: InputSignal<Readonly<Record<string, string>>> = input<
    Readonly<Record<string, string>>
  >({});
  //#endregion

  //#region Properties
  /**
   * Property segments
   * @readonly
   *
   * @description
   * The body split into text and mention runs, in render order.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly MessageBodySegment[]>}
   */
  protected readonly segments: Signal<readonly MessageBodySegment[]> = computed(
    (): readonly MessageBodySegment[] => tokenizeMessageBody(this.body()),
  );
  //#endregion

  //#region Methods
  /**
   * Method labelFor
   * @method labelFor
   *
   * @description
   * Resolves a mention's display label.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} memberId - Mentioned member identifier.
   *
   * @return {string} The member's name, or a neutral fallback.
   */
  protected labelFor(memberId: string): string {
    return this.memberNames()[memberId] ?? $localize`:@@workspace.mention.unknown:member`;
  }
  //#endregion
}
