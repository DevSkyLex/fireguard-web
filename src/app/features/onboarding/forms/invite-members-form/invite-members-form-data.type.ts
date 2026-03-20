import type { FormArray, FormControl, FormGroup } from '@angular/forms';

/**
 * Interface InviteeRowData
 *
 * @description
 * Typed FormGroup shape for a single invitee row.
 *
 * @since 1.0.0
 */
export interface InviteeRowData {
  email: FormControl<string>;
  roleId: FormControl<string | null>;
}

/**
 * Interface InviteMembersFormData
 *
 * @description
 * Shape of the invite-members form controls.
 * Used as the generic parameter of `FormGroup<InviteMembersFormData>`.
 *
 * @since 1.0.0
 */
export interface InviteMembersFormData {
  rows: FormArray<FormGroup<InviteeRowData>>;
}
