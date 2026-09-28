import type { HydraItem } from '@core/api/models';

/** Acknowledgement of a typing or delivery signal. */
export interface ConversationSignalOutput extends HydraItem {
  readonly accepted: boolean;
}
