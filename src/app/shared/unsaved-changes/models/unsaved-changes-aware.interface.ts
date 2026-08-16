import type { Observable } from 'rxjs';

/**
 * Interface UnsavedChangesAware
 * @interface UnsavedChangesAware
 *
 * @description
 * The contract a page (or any `CanDeactivate`-guarded component) implements
 * to opt into `unsavedChangesGuard`. The guard never conjures its own
 * overlay — this app never uses an imperative dialog service — so the
 * component itself hosts a declarative `app-unsaved-changes-dialog` and
 * resolves {@link confirmDeactivation} from that dialog's outputs.
 *
 * @access public
 * @since 1.0.0
 */
export interface UnsavedChangesAware {
  /**
   * Method hasUnsavedChanges
   * @method hasUnsavedChanges
   *
   * @description
   * Reports whether leaving now would discard work — typically
   * `form.dirty() && !submitting()`. `false` lets the guard resolve `true`
   * without ever prompting.
   *
   * @access public
   * @since 1.0.0
   *
   * @returns {boolean} Whether the component currently holds unsaved work.
   */
  hasUnsavedChanges(): boolean;

  /**
   * Method confirmDeactivation
   * @method confirmDeactivation
   *
   * @description
   * Opens the component's hosted `app-unsaved-changes-dialog` and resolves
   * once the reader picks Cancel (`false`) or Discard (`true`).
   *
   * @access public
   * @since 1.0.0
   *
   * @returns {Observable<boolean> | Promise<boolean>} Resolves `true` when
   * the reader confirms leaving, `false` when they cancel.
   */
  confirmDeactivation(): Observable<boolean> | Promise<boolean>;
}
