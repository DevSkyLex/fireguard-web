/**
 * Type ChannelPanelTab
 * @typedef ChannelPanelTab
 *
 * @description
 * The four sections of the channel info panel. Each of the last three is
 * backed by its own conversation-scoped collection and is fetched only when
 * opened.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export type ChannelPanelTab = 'info' | 'pins' | 'files' | 'links';
