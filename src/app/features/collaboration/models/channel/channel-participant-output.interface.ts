import type { HydraItem } from '@core/api/models';
import type { ChannelParticipantSource } from './channel-participant-source.type';

/**
 * Interface ChannelParticipantOutput
 * @interface ChannelParticipantOutput
 *
 * @description
 * One member's participation in a channel. Keyed by {@link memberId}, which
 * arrives as a **bare** UUID rather than an IRI — unlike most member
 * references in this API.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface ChannelParticipantOutput extends HydraItem {
  /** Bare organization-member UUID. The entity key. */
  readonly memberId: string;
  /** Free-form participation role, at most 50 characters. */
  readonly role?: string;
  readonly source: ChannelParticipantSource;
  readonly addedAt: string;
}
