import type { HydraItem } from '@core/api/models';

/**
 * Interface ImportTemplateOutput
 * @interface ImportTemplateOutput
 *
 * @description
 * A server-owned CSV template for an authorized import kind.
 *
 * @since 1.1.0
 */
export interface ImportTemplateOutput extends HydraItem {
  /**
   * Property filename
   * @readonly
   *
   * @description
   * Provides the original name of the selected file.
   *
   * @access public
   *
   * @type {string}
   */
  readonly filename: string;

  /**
   * Property content
   * @readonly
   *
   * @description
   * Contains the imported file contents submitted for processing.
   *
   * @access public
   *
   * @type {string}
   */
  readonly content: string;

  /**
   * Property mediaType
   * @readonly
   *
   * @description
   * Provides the media type declared for this uploaded file.
   *
   * @access public
   *
   * @type {string}
   */
  readonly mediaType: string;
}
