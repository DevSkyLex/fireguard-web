/**
 * Function loadAddressFlag
 * @description Loads the installed Ng Icons flag collection only when a confirmed address needs a flag.
 * @access public
 * @since 1.0.0
 * @param {string} name - ISO-based Ng Icons flag name.
 * @returns {Promise<string>} Trusted bundled SVG, or an empty icon for an unsupported code or failed chunk.
 */
export async function loadAddressFlag(name: string): Promise<string> {
  if (!/^flag[A-Z][a-z]$/.test(name)) return '';
  try {
    const flags: Readonly<Record<string, unknown>> = await import('@ng-icons/flag-icons');
    const svg: unknown = flags[name];
    return typeof svg === 'string' ? svg : '';
  } catch {
    return '';
  }
}
