/**
 * What kind of record a message reference points at.
 *
 * Mirrors the backend `MessageReference::ALLOWED_TYPES` exactly — the four
 * subject types the messaging subject resolver knows how to resolve. `channel`
 * and `direct` are deliberately absent: they have no owning record to point at.
 *
 * @since 1.4.0
 */
export type MessageReferenceType = 'non_conformity' | 'intervention' | 'facility' | 'equipment';

/**
 * A structured record card attached to a message.
 *
 * ⚠️ `label` and `code` are optional **and** possibly absent: API Platform
 * omits null fields from its JSON, so a "nullable" backend property arrives as
 * `undefined`, never as `null`. Read them with `?? null` or a `typeof` check;
 * a `=== null` guard lets `undefined` straight through.
 *
 * A message carries at most `MessageReference::MAX_REFERENCES` (5) of these,
 * and a tombstoned message carries `[]` — a reference is part of the message's
 * own content, so it is redacted with the body.
 *
 * @since 1.4.0
 */
export interface MessageReference {
  readonly type: MessageReferenceType;
  readonly id: string;
  readonly label?: string | null;
  readonly code?: string | null;
}
