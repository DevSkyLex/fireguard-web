import type { HydraItem } from '@core/api/models';

/**
 * Interface ChannelOutput
 * @interface ChannelOutput
 *
 * @description
 * A named group conversation. Wire shape of the API's `ChannelResource`.
 * Key rows off {@link id}, never off `@id`: this DTO is re-normalized through
 * the anonymous JSON-LD path, so `@id` is a fresh Skolem genid on every
 * response and `@type` is the DTO class name rather than a resource type.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface ChannelOutput extends HydraItem {
  /**
   * Property id
   * @readonly
   *
   * @description
   * Bare UUID. The entity key.
   *
   * @access public
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property organization
   * @readonly
   *
   * @description
   * IRI of the owning organization.
   *
   * @access public
   *
   * @type {string}
   */
  readonly organization: string;

  /**
   * Property name
   * @readonly
   *
   * @description
   * Channel name, 2–80 characters.
   *
   * @access public
   *
   * @type {string}
   */
  readonly name: string;

  /**
   * Property team
   * @readonly
   *
   * @description
   * IRI of the bound organization team, omitted when the channel is unbound.
   *
   * @access public
   *
   * @type {string}
   */
  readonly team?: string;

  /**
   * Property createdByMember
   * @readonly
   *
   * @description
   * IRI of the member who created the channel.
   *
   * @access public
   *
   * @type {string}
   */
  readonly createdByMember?: string;

  /**
   * Property participantCount
   * @readonly
   *
   * @description
   * Number of participants, including those pulled in by a bound team.
   *
   * @access public
   *
   * @type {number}
   */
  readonly participantCount: number;

  /**
   * Property isArchived
   * @readonly
   *
   * @description
   * Indicates whether this channel is archived.
   *
   * @access public
   *
   * @type {boolean}
   */
  readonly isArchived: boolean;

  /**
   * Property lastMessageAt
   * @readonly
   *
   * @description
   * ISO-8601 with a numeric offset; omitted while the channel has no message.
   *
   * @access public
   *
   * @type {string}
   */
  readonly lastMessageAt?: string;

  /**
   * Property messagesCount
   * @readonly
   *
   * @description
   * Total messages, replies included.
   *
   * @access public
   *
   * @type {number}
   */
  readonly messagesCount: number;

  /**
   * Property unreadCount
   * @readonly
   *
   * @description
   * Unread messages for the acting member.
   * Hard-coded to `0` by the list provider and by every write response — only
   * trust it from a source that genuinely computes it.
   *
   * @access public
   *
   * @type {number}
   */
  readonly unreadCount: number;

  /**
   * Property createdAt
   * @readonly
   *
   * @description
   * Records when this channel was created.
   *
   * @access public
   *
   * @type {string}
   */
  readonly createdAt: string;

  /**
   * Property updatedAt
   * @readonly
   *
   * @description
   * Records when this channel was last updated.
   *
   * @access public
   *
   * @type {string}
   */
  readonly updatedAt: string;

  /**
   * Property isFavorite
   * @readonly
   *
   * @description
   * Whether the acting member favorited the channel. Always `false` on write responses.
   *
   * @access public
   *
   * @type {boolean}
   */
  readonly isFavorite: boolean;

  /**
   * Property parent
   * @readonly
   *
   * @description
   * IRI of the parent channel when nested, omitted at the root.
   *
   * @access public
   *
   * @type {string}
   */
  readonly parent?: string;
}
