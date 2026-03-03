export interface ChecklistItemInput {
  readonly label: string;
  readonly description?: string | null;
  readonly required?: boolean;
  readonly position?: number;
}
