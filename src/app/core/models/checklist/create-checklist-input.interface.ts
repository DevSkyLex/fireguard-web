import type { ChecklistItemInput } from './checklist-item-input.interface';

export interface CreateChecklistInput {
  readonly name: string;
  readonly version: string;
  readonly items?: ReadonlyArray<ChecklistItemInput>;
}
