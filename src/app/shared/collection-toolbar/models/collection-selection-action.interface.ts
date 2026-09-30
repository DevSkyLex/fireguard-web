/**
 * Interface CollectionSelectionCommand
 * @interface CollectionSelectionCommand
 *
 * @description
 * One collection action; its owner supplies the label, icon and permission decision.
 *
 * @since 1.0.0
 */
export interface CollectionSelectionCommand {
  /**
   * Property kind
   * @readonly
   *
   * @description
   * Discriminates an executable command from a grouped action section.
   *
   * @access public
   * @since unreleased
   *
   * @type {'command'}
   */
  readonly kind: 'command';

  /**
   * Property id
   * @readonly
   *
   * @description
   * Stable action key used by the owning collection surface.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property label
   * @readonly
   *
   * @description
   * Localized action text displayed in the toolbar or mobile drawer.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly label: string;

  /**
   * Property icon
   * @readonly
   *
   * @description
   * Registered icon name displayed with the action label.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly icon: string;

  /**
   * Property disabled
   * @readonly
   *
   * @description
   * Prevents invoking the action while its owner reports it unavailable.
   *
   * @access public
   * @since unreleased
   *
   * @type {boolean}
   */
  readonly disabled?: boolean;

  /**
   * Property disabledReason
   * @readonly
   *
   * @description
   * Explains why the disabled action cannot currently run.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly disabledReason?: string;

  /**
   * Property destructive
   * @readonly
   *
   * @description
   * Marks an action whose styling should communicate destructive consequences.
   *
   * @access public
   * @since unreleased
   *
   * @type {boolean}
   */
  readonly destructive?: boolean;
}

/**
 * Interface CollectionSelectionGroup
 * @interface CollectionSelectionGroup
 *
 * @description
 * Related commands shown in one desktop menu and one mobile drawer section.
 *
 * @since 1.0.0
 */
export interface CollectionSelectionGroup {
  /**
   * Property kind
   * @readonly
   *
   * @description
   * Discriminates a grouped section from an executable command.
   *
   * @access public
   * @since unreleased
   *
   * @type {'group'}
   */
  readonly kind: 'group';

  /**
   * Property id
   * @readonly
   *
   * @description
   * Stable group key used by the collection selection surface.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property label
   * @readonly
   *
   * @description
   * Localized heading shown for the related commands.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly label: string;

  /**
   * Property icon
   * @readonly
   *
   * @description
   * Registered icon name displayed beside the group heading.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly icon: string;

  /**
   * Property disabled
   * @readonly
   *
   * @description
   * Disables the group and its actions when the owner reports them unavailable.
   *
   * @access public
   * @since unreleased
   *
   * @type {boolean}
   */
  readonly disabled?: boolean;

  /**
   * Property disabledReason
   * @readonly
   *
   * @description
   * Explains why the grouped actions cannot currently run.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly disabledReason?: string;

  /**
   * Property destructive
   * @readonly
   *
   * @description
   * Marks the group as containing destructive actions for menu styling.
   *
   * @access public
   * @since unreleased
   *
   * @type {boolean}
   */
  readonly destructive?: boolean;

  /**
   * Property actions
   * @readonly
   *
   * @description
   * Commands exposed together in this desktop menu and mobile drawer section.
   *
   * @access public
   * @since unreleased
   *
   * @type {readonly CollectionSelectionCommand[]}
   */
  readonly actions: readonly CollectionSelectionCommand[];
}

/**
 * Type CollectionSelectionAction
 *
 * @description
 * Data-only action model shared by the desktop bar and mobile drawer.
 *
 * @since 1.0.0
 *
 * @type CollectionSelectionAction
 */
export type CollectionSelectionAction = CollectionSelectionCommand | CollectionSelectionGroup;
