/**
 * Function fileToBase64
 *
 * @description
 * Reads `file`'s content and resolves with its base64 encoding, stripped of
 * the `data:<mime>;base64,` prefix — the shape `EquipmentService.addAttachment`
 * (`AddAttachmentInput.content`) expects. Uses `FileReader.readAsDataURL`, a
 * browser-only API; callers only invoke this from a user action (a file
 * pick), which never runs during SSR.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {File} file - The picked file to encode.
 *
 * @returns {Promise<string>} The base64-encoded content, without the data URL prefix.
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader: FileReader = new FileReader();

    reader.addEventListener('load', (): void => {
      const result: string = reader.result as string;
      const commaIndex: number = result.indexOf(',');

      resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
    });
    reader.addEventListener('error', (): void =>
      reject(reader.error ?? new Error('Failed to read file')),
    );

    reader.readAsDataURL(file);
  });
}
