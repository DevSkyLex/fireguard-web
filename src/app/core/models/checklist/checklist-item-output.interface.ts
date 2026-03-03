export interface ChecklistItemOutput {
  readonly id: string;
  readonly label: string;
  readonly position: number;
  readonly required: boolean;
  readonly description: string | null;
}
