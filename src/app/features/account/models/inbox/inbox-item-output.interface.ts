/**
 * Interface InboxItemOutput
 * @interface InboxItemOutput
 * @description One source-owned entry in the unified inbox; identifiers are unique within each source.
 * @since 1.0.0
 */
export interface InboxItemOutput {
  /**
   * Property sourceKey
   * @readonly
   * @description Stable source name used with id as the entity key.
   * @access public
   * @since 1.0.0
   * @type {string}
   */
  readonly sourceKey: string;

  /**
   * Property id
   * @readonly
   * @description Identifier owned by the source.
   * @access public
   * @since 1.0.0
   * @type {string}
   */
  readonly id: string;

  /**
   * Property kind
   * @readonly
   * @description Nature of the entry.
   * @access public
   * @since 1.0.0
   * @type {string}
   */
  readonly kind: string;

  /**
   * Property title
   * @readonly
   * @description Server-provided title.
   * @access public
   * @since 1.0.0
   * @type {string}
   */
  readonly title: string;

  /**
   * Property snippet
   * @readonly
   * @description Plain preview text.
   * @access public
   * @since 1.0.0
   * @type {string | null}
   */
  readonly snippet: string | null;

  /**
   * Property occurredAt
   * @readonly
   * @description Server ordering timestamp.
   * @access public
   * @since 1.0.0
   * @type {string}
   */
  readonly occurredAt: string;

  /**
   * Property isRead
   * @readonly
   * @description Read state evaluated by the owning source.
   * @access public
   * @since 1.0.0
   * @type {boolean}
   */
  readonly isRead: boolean;

  /**
   * Property organizationId
   * @readonly
   * @description Organization needed to open the target.
   * @access public
   * @since 1.0.0
   * @type {string | null}
   */
  readonly organizationId: string | null;

  /**
   * Property targetType
   * @readonly
   * @description Notification or conversation target.
   * @access public
   * @since 1.0.0
   * @type {string}
   */
  readonly targetType: string;

  /**
   * Property targetId
   * @readonly
   * @description Identifier understood by the target route.
   * @access public
   * @since 1.0.0
   * @type {string}
   */
  readonly targetId: string;

  /**
   * Property targetKind
   * @readonly
   * @description Conversation kind used to select channels or messages.
   * @access public
   * @since 1.0.0
   * @type {string | null}
   */
  readonly targetKind: string | null;
}
