import type { OrganizationAvatarSize } from '../models';

/**
 * Interface OrganizationAvatarSizeClasses
 *
 * @description
 * The three class strings one avatar size needs, one per element the spartan
 * primitive splits an avatar into. They are kept together because they must
 * agree: the corner radius has to land on the root, on its `::after` ring and
 * on the image at once, which is exactly what a caller writing them by hand
 * kept getting wrong.
 *
 * @since 1.0.0
 */
export interface OrganizationAvatarSizeClasses {
  /** The `hlm-avatar` root: box size and the radius, ring included. */
  readonly root: string;
  /** The `hlmAvatarImage`: the same radius, so a real logo is not clipped round. */
  readonly media: string;
  /** The `hlmAvatarFallback`: the same radius, plus the initials' type size. */
  readonly fallback: string;
}

/**
 * Constant ORGANIZATION_AVATAR_SIZE_CLASSES
 *
 * @description
 * Literal class strings per size — literal because Tailwind scans source text
 * and never sees a value a template computed.
 *
 * The radius steps down on the smallest rung (`DESIGN.md` "Shapes": a corner
 * must not overwhelm a short edge), and `text-[10px]` on that rung is the
 * documented sub-Label exception for initials fitted to a container.
 *
 * @since 1.0.0
 *
 * @type {Readonly<Record<OrganizationAvatarSize, OrganizationAvatarSizeClasses>>}
 */
export const ORGANIZATION_AVATAR_SIZE_CLASSES: Readonly<
  Record<OrganizationAvatarSize, OrganizationAvatarSizeClasses>
> = {
  xs: {
    root: 'size-6 rounded-md after:rounded-md',
    media: 'rounded-md',
    fallback: 'rounded-md text-[10px]',
  },
  sm: {
    root: 'size-8 rounded-lg after:rounded-lg',
    media: 'rounded-lg',
    fallback: 'rounded-lg text-xs',
  },
  md: {
    root: 'size-9 rounded-lg after:rounded-lg',
    media: 'rounded-lg',
    fallback: 'rounded-lg text-xs',
  },
  lg: {
    root: 'size-14 rounded-lg after:rounded-lg',
    media: 'rounded-lg',
    fallback: 'rounded-lg text-sm',
  },
};
