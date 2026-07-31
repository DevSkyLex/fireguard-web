/**
 * Interface QuillEditor
 * @interface QuillEditor
 *
 * @description
 * The slice of Quill's API the composer drives, described structurally.
 *
 * Quill is not imported for its types: `p-editor` loads it through a dynamic
 * `import('quill')` so the bundle stays SSR-safe, and importing the package
 * statically here just to name a type would undo that. This is the whole
 * surface the composer touches, and nothing else.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface QuillEditor {
  /** The contenteditable element — `.ql-editor`, the field itself. */
  readonly root: HTMLElement;
  /** Current selection, or `null` when the editor does not have focus. */
  getSelection(focus?: boolean): { readonly index: number; readonly length: number } | null;
  /** Plain text, in the same index space as {@link getSelection}. */
  getText(index?: number, length?: number): string;
  setText(text: string, source?: string): unknown;
  deleteText(index: number, length: number, source?: string): unknown;
  insertText(index: number, text: string, source?: string): unknown;
  setSelection(index: number, length?: number, source?: string): unknown;
  focus(): void;
}
