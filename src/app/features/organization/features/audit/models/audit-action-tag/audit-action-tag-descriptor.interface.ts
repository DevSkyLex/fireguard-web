import type { AuditActionModule } from '../audit-action/audit-action-module.type';

/**
 * Interface AuditActionTagDescriptor
 *
 * @interface AuditActionTagDescriptor
 *
 * @description
 * How one audit action id presents, wherever it appears: the filter
 * combobox, a table row, an exported label. `label` is per action;
 * `icon` is per {@link module} rather than per action — 68 distinct icons
 * would carry no more information than the 12 module ones already do.
 *
 * @since 1.0.0
 */
export interface AuditActionTagDescriptor {
  /** Localized human label for the action itself. @type {string} */
  readonly label: string;

  /** The module namespace this action belongs to. @type {AuditActionModule} */
  readonly module: AuditActionModule;

  /** Localized human label for {@link module}, for the combobox's group headers. @type {string} */
  readonly moduleLabel: string;

  /** Registered `@ng-icons/lucide` name, shared by every action of {@link module}. @type {string} */
  readonly icon: string;
}
