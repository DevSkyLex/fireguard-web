import type { HydraItem } from './hydra-item.interface';

/**
 * Interface OptionOutput
 *
 * @description
 * Generic value/label reference item returned by many catalog endpoints.
 */
export interface OptionOutput extends HydraItem {
  readonly value: string;
  readonly label: string;
}
