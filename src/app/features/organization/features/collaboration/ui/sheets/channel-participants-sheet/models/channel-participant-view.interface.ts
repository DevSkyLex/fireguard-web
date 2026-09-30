import type { ChannelParticipantSource } from '@features/organization/features/collaboration/models';

/**
 * Interface ChannelParticipantView
 * @interface
 *
 * @description
 * One roster row as {@link ChannelParticipantsSheet} draws it: the raw
 * `ChannelParticipantOutput` resolved to a name and a face through the
 * member directory, the way `DirectConversationPage` resolves a counterpart.
 *
 * @since 1.0.0
 */
export interface ChannelParticipantView {
  /**
   * Property memberId
   * @readonly
   *
   * @description
   * Bare organization-member UUID.
   *
   * @access public
   *
   * @type {string}
   */
  readonly memberId: string;

  /**
   * Property displayName
   * @readonly
   *
   * @description
   * Never blank: falls back to a neutral label when the directory cannot resolve the member.
   *
   * @access public
   *
   * @type {string}
   */
  readonly displayName: string;

  /**
   * Property avatarUrl
   * @readonly
   *
   * @description
   * Provides the participant avatar URL when available.
   *
   * @access public
   *
   * @type {string}
   */
  readonly avatarUrl?: string;

  /**
   * Property isResolved
   * @readonly
   *
   * @description
   * Whether {@link displayName} is a real name rather than the fallback label.
   *
   * @access public
   *
   * @type {boolean}
   */
  readonly isResolved: boolean;

  /**
   * Property role
   * @readonly
   *
   * @description
   * Names this participant’s role in the channel.
   *
   * @access public
   *
   * @type {string}
   */
  readonly role?: string;

  /**
   * Property source
   * @readonly
   *
   * @description
   * Identifies the source that added this channel participant.
   *
   * @access public
   *
   * @type {ChannelParticipantSource}
   */
  readonly source: ChannelParticipantSource;
}
