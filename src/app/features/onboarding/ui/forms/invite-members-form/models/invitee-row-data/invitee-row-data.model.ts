import type { FormControl } from '@angular/forms';

/**
 * Interface InviteeRowData
 * @interface InviteeRowData
 *
 * @description
 * Typed controls for a single invitee row.
 *
 * @since 1.0.0
 */
export interface InviteeRowData {
  email: FormControl<string>;
  roleId: FormControl<string | null>;
}
