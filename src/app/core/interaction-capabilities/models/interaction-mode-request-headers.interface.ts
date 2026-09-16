/**
 * Interface InteractionModeRequestHeaders
 * @interface InteractionModeRequestHeaders
 * @description Minimal request-header reader required for server-side interaction-mode classification.
 * @since 1.0.0
 */
export interface InteractionModeRequestHeaders {
  /**
   * Method get
   * @method get
   * @description Reads one request header without coupling classification to a server adapter.
   * @access public
   * @since 1.0.0
   * @param {string} name - Case-insensitive request-header name.
   * @returns {string | null} Header value when present.
   */
  get(name: string): string | null;
}
