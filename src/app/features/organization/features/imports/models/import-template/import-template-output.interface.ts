import type { HydraItem } from '@core/api/models';

/**
 * Interface ImportTemplateOutput
 * @interface ImportTemplateOutput
 * @description A server-owned CSV template for an authorized import kind.
 * @since 1.1.0
 */
export interface ImportTemplateOutput extends HydraItem {
  readonly filename: string;
  readonly content: string;
  readonly mediaType: string;
}
