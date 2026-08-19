/**
 * Type AuditActionModule
 *
 * @description
 * The backend module namespace an audit action id is prefixed with
 * (`'facility.created'` → `'facility'`). `'other'` is a frontend-only
 * fallback for an action id whose prefix matches none of the eleven real
 * modules — it never appears in a backend response.
 *
 * @since 1.0.0
 */
export type AuditActionModule =
  | 'organization'
  | 'facility'
  | 'equipment'
  | 'inspection'
  | 'intervention'
  | 'maintenance'
  | 'calendar'
  | 'automation'
  | 'messaging'
  | 'import'
  | 'compliance'
  | 'webhook'
  | 'approval'
  | 'other';
