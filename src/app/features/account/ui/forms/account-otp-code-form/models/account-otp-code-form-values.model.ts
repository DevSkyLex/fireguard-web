/**
 * Interface AccountOtpCodeFormValues
 *
 * @description
 * The single field the code form edits. It exists because `form()` needs an
 * object to build a field tree over; the component emits the bare code, since
 * wrapping one string in one object buys the caller nothing.
 *
 * @since 1.0.0
 */
export interface AccountOtpCodeFormValues {
  code: string;
}
