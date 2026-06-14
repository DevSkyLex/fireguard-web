/**
 * Label/value option displayed by intervention workflow controls.
 */
export interface SelectOption<T extends string = string> {
  readonly label: string;
  readonly value: T;
}
