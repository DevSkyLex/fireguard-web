/**
 * Type AuditActorType
 *
 * @description
 * Who performed an audited action, mirroring the backend
 * `OrganizationAuditEventOutput.actorType` byte for byte. `actorDisplayName`
 * is resolved only for `'user'` actors who are members of the organization
 * (including deactivated ones); the other three values never carry a name.
 *
 * @since 1.0.0
 */
export type AuditActorType = 'user' | 'client' | 'system' | 'anonymous';
