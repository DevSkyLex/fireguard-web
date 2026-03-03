export interface AddAttachmentInput {
  readonly fileName: string;
  readonly content: string;
  readonly mimeType: string;
  readonly label?: string | null;
}
