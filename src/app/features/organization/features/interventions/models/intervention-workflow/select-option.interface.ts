/**
 * Interface SelectOption
 * @interface SelectOption
 *
 * @description
 * Typed label/value option displayed by intervention workflow controls. An
 * optional semantic color lets an owning feature provide a visual cue to its
 * option template without coupling shared filter UI to the feature model.
 *
 * @since 1.0.0
 */
export interface SelectOption<T extends string = string> {
  /**
   * Property label
   * @readonly
   *
   * @description
   * Provides the text displayed to identify this select option.
   *
   * @access public
   *
   * @type {string}
   */
  readonly label: string;

  /**
   * Property value
   * @readonly
   *
   * @description
   * Provides the value submitted when this select option is selected.
   *
   * @access public
   *
   * @type {T}
   */
  readonly value: T;

  /**
   * Property color
   * @readonly
   *
   * @description
   * Provides the label color selected in the form.
   *
   * @access public
   *
   * @type {string}
   */
  readonly color?: string;
}
