/**
 * Type ThreadSubjectType
 * @type ThreadSubjectType
 *
 * @description
 * The narrower set `POST /api/conversations` actually accepts. Channels and
 * direct conversations have their own creation endpoints and cannot be opened
 * through the subject-thread route.
 *
 * @since 1.0.0
 */
export type ThreadSubjectType = 'facility' | 'equipment' | 'intervention' | 'non_conformity';
