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
  readonly label: string;
  readonly value: T;
  readonly color?: string;
}
