import type { MemberSelectOption } from '@features/organization/features/interventions/models';

/**
 * Interface InterventionCommentSelectedMention
 * @interface InterventionCommentSelectedMention
 *
 * @description
 * One readable mention inserted from the picker, including its current range
 * in the comment draft so an identical manually typed name stays plain text.
 *
 * @since 2.1.0
 */
export interface InterventionCommentSelectedMention {
  /**
   * Property member
   * @readonly
   *
   * @description
   * Member whose API identity replaces this occurrence on submit.
   *
   * @access public
   * @since 2.1.0
   *
   * @type {MemberSelectOption}
   */
  readonly member: MemberSelectOption;

  /**
   * Property start
   * @readonly
   *
   * @description
   * Inclusive offset of the visible `@Display name` marker.
   *
   * @access public
   * @since 2.1.0
   *
   * @type {number}
   */
  readonly start: number;

  /**
   * Property end
   * @readonly
   *
   * @description
   * Exclusive offset of the visible `@Display name` marker.
   *
   * @access public
   * @since 2.1.0
   *
   * @type {number}
   */
  readonly end: number;
}
