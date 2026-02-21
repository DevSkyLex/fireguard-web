import type { FormControl } from '@angular/forms';
import type { InviteMembersFormValues } from './invite-members-form-values.type';

export type InviteMembersFormData = {
  [K in keyof InviteMembersFormValues]: FormControl<InviteMembersFormValues[K]>;
};
