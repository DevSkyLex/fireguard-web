/**
 * Interface SelectOption
 * @interface SelectOption
 *
 * @description
 * A generic label/value pair for a select or combobox item. Feature-local
 * copy — this subfeature has only one consumer of the shape
 * (`InspectionCreationOptionsStore` feeding `InspectionCreateForm`'s
 * equipment combobox), too few to justify a `shared/` abstraction
 * (`ARCHITECTURE.md` §2.9).
 *
 * @since 1.0.0
 */
export interface SelectOption {
  /** The option's display label. */
  readonly label: string;

  /** The option's underlying value, e.g. an id. */
  readonly value: string;
}
