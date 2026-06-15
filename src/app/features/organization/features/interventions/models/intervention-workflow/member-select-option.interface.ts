import type { SelectOption } from './select-option.interface';

/**
 * Rich organization-member option displayed by intervention assignment controls.
 */
export interface MemberSelectOption extends SelectOption {
  readonly displayName: string;
  readonly roleLabel: string;
  readonly avatarUrl: string | null;
  readonly initials: string;
}
