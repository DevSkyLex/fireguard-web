/**
 * Function displayNotificationBody
 * @description Hides the session identifier embedded in onboarding notifications sent before the copy was corrected.
 * @access public
 * @since 1.0.0
 * @param {string | null} body - Stored notification body or inbox preview.
 * @returns {string | null} The body without the legacy onboarding session identifier.
 */
export function displayNotificationBody(body: string | null): string | null {
  return (
    body?.replace(
      /^(Congratulations! Your organization onboarding) \(session [\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}\)/i,
      '$1',
    ) ?? null
  );
}
