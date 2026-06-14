/**
 * Label/value option displayed by mission workflow controls.
 */
export interface SelectOption<T extends string = string> {
  readonly label: string;
  readonly value: T;
}
