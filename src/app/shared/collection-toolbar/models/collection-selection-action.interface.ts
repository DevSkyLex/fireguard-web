/**
 * Interface CollectionSelectionCommand
 * @interface CollectionSelectionCommand
 * @description One collection action; its owner supplies the label, icon and permission decision.
 * @since 1.0.0
 */
export interface CollectionSelectionCommand {
  readonly kind: 'command';
  readonly id: string;
  readonly label: string;
  readonly icon: string;
  readonly disabled?: boolean;
  readonly disabledReason?: string;
  readonly destructive?: boolean;
}

/**
 * Interface CollectionSelectionGroup
 * @interface CollectionSelectionGroup
 * @description Related commands shown in one desktop menu and one mobile drawer section.
 * @since 1.0.0
 */
export interface CollectionSelectionGroup {
  readonly kind: 'group';
  readonly id: string;
  readonly label: string;
  readonly icon: string;
  readonly disabled?: boolean;
  readonly disabledReason?: string;
  readonly destructive?: boolean;
  readonly actions: readonly CollectionSelectionCommand[];
}

/**
 * Type CollectionSelectionAction
 * @type CollectionSelectionAction
 * @description Data-only action model shared by the desktop bar and mobile drawer.
 * @since 1.0.0
 */
export type CollectionSelectionAction = CollectionSelectionCommand | CollectionSelectionGroup;
