import type { HydraItem } from '@core/api/models';
import type { ChannelParticipantSource } from './channel-participant-source.type';

/**
 * Interface ChannelParticipantOutput
 * @interface ChannelParticipantOutput
 *
 * @description
 * One member's participation in a channel. Keyed by {@link memberId}, which
 * arrives as a **bare** UUID rather than an IRI — unlike most member
 * references in this API.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface ChannelParticipantOutput extends HydraItem {
  /**
   * Property memberId
   * @readonly
   *
   * @description
   * Bare organization-member UUID. The entity key.
   *
   * @access public
   *
   * @type {string}
   */
  readonly memberId: string;

  /**
   * Property role
   * @readonly
   *
   * @description
   * Free-form participation role, at most 50 characters.
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

  /**
   * Property addedAt
   * @readonly
   *
   * @description
   * Records when this channel participant was added.
   *
   * @access public
   *
   * @type {string}
   */
  readonly addedAt: string;
}
