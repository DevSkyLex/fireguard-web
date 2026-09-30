import type { HydraItem } from '@core/api/models';
import type { ConversationSubjectType } from './conversation-subject-type.type';
import type { ConversationVisibility } from './conversation-visibility.type';

/**
 * Interface ConversationOutput
 * @interface ConversationOutput
 *
 * @description
 * A conversation: a subject thread, a channel, or a direct message. All three
 * share this shape and are told apart by {@link subjectType}.
 * Several fields are only real on some responses. {@link unreadCount} and
 * {@link isFavorite} are fabricated as `0` / `false` by every write endpoint,
 * and {@link subjectLabel} is resolved only when reading a single conversation
 * or opening one by subject. Patch, never merge wholesale.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface ConversationOutput extends HydraItem {
  /**
   * Property id
   * @readonly
   *
   * @description
   * Bare UUID. The entity key — never use `@id`.
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
   * Property subjectType
   * @readonly
   *
   * @description
   * Identifies the subject category for this conversation.
   *
   * @access public
   *
   * @type {ConversationSubjectType}
   */
  readonly subjectType: ConversationSubjectType;

  /**
   * Property subject
   * @readonly
   *
   * @description
   * IRI of the attached record. Omitted for channels. For a direct
   * conversation this is an opaque `/api/direct/<32hex>` hash — never decode
   * it, and never try to dereference it.
   *
   * @access public
   *
   * @type {string}
   */
  readonly subject?: string;

  /**
   * Property subjectLabel
   * @readonly
   *
   * @description
   * Resolved only by `GET /conversations/{id}` and `POST /conversations`.
   *
   * @access public
   *
   * @type {string}
   */
  readonly subjectLabel?: string;

  /**
   * Property visibility
   * @readonly
   *
   * @description
   * Specifies who can access this conversation.
   *
   * @access public
   *
   * @type {ConversationVisibility}
   */
  readonly visibility: ConversationVisibility;

  /**
   * Property lastMessageAt
   * @readonly
   *
   * @description
   * ISO-8601 with a numeric offset; omitted until the first message.
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
   * Replies included.
   *
   * @access public
   *
   * @type {number}
   */
  readonly messagesCount: number;

  /**
   * Property isArchived
   * @readonly
   *
   * @description
   * Indicates whether this conversation is archived.
   *
   * @access public
   *
   * @type {boolean}
   */
  readonly isArchived: boolean;

  /**
   * Property unreadCount
   * @readonly
   *
   * @description
   * Real on the list and item reads only; `0` on every write response.
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
   * Records when this conversation was created.
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
   * Records when this conversation was last updated.
   *
   * @access public
   *
   * @type {string}
   */
  readonly updatedAt: string;

  /**
   * Property isChannel
   * @readonly
   *
   * @description
   * True only for `subjectType === 'channel'` — a direct conversation is not a channel.
   *
   * @access public
   *
   * @type {boolean}
   */
  readonly isChannel: boolean;

  /**
   * Property name
   * @readonly
   *
   * @description
   * Channels only; never present for a direct conversation.
   *
   * @access public
   *
   * @type {string}
   */
  readonly name?: string;

  /**
   * Property team
   * @readonly
   *
   * @description
   * IRI of the bound organization team.
   *
   * @access public
   *
   * @type {string}
   */
  readonly team?: string;

  /**
   * Property isFavorite
   * @readonly
   *
   * @description
   * Real on the list and item reads only; `false` on every write response.
   *
   * @access public
   *
   * @type {boolean}
   */
  readonly isFavorite: boolean;

  /**
   * Property parentConversationId
   * @readonly
   *
   * @description
   * Bare parent conversation id — not an IRI, unlike most references here.
   *
   * @access public
   *
   * @type {string}
   */
  readonly parentConversationId?: string;

  /**
   * Property counterpartMember
   * @readonly
   *
   * @description
   * The other participant's member IRI. Present only on
   * `GET /api/direct-conversations`, which is why that list cannot be replaced
   * by the create response — the latter has no counterpart and would render
   * unlabeled.
   *
   * @access public
   *
   * @type {string}
   */
  readonly counterpartMember?: string;
}
