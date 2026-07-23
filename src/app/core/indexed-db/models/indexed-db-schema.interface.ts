/**
 * Interface IndexedDbSchema
 * @interface IndexedDbSchema
 *
 * @description
 * Everything {@link IndexedDbService} needs to open and upgrade one database.
 *
 * Upgrades are intentionally version-agnostic: stores listed here are created
 * if missing, stores in {@link retiredStoreNames} are dropped if present, and
 * nothing else happens. Bumping {@link version} and editing these two lists
 * *is* the whole migration procedure — there is no data-transform path, so a
 * change that must preserve existing records needs its own migration step
 * written by hand.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface IndexedDbSchema {
  /** Database name. Two features must not share one unless they intend to. */
  readonly name: string;
  /** Bump whenever {@link storeNames} or {@link retiredStoreNames} changes. */
  readonly version: number;
  /** Every store the database owns. Created on upgrade when missing. */
  readonly storeNames: readonly string[];
  /** Stores a past version created and this one no longer wants. */
  readonly retiredStoreNames?: readonly string[];
  /**
   * Store holding the owner binding. Must appear in {@link storeNames}, and
   * must not be one a feature clears on its own — wiping it silently unbinds
   * the database and lets the next user inherit the previous one's records.
   */
  readonly ownerStoreName: string;
}
