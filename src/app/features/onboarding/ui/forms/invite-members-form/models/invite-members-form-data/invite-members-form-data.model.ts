import type { FormArray, FormGroup } from '@angular/forms';
import type { InviteeRowData } from '../invitee-row-data';

/**
 * Interface InviteMembersFormData
 * @interface InviteMembersFormData
 *
 * @description
 * Typed controls of the invite-members form.
 *
 * @since 1.0.0
 */
export interface InviteMembersFormData {
  rows: FormArray<FormGroup<InviteeRowData>>;
}
