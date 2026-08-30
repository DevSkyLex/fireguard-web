import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { InputSignal, Signal } from '@angular/core';
import { getOrganizationInitials } from '@features/organization/utils';
import { HlmAvatar, HlmAvatarFallback, HlmAvatarImage } from '@shared/ui/avatar';
import {
  ORGANIZATION_AVATAR_SIZE_CLASSES,
  ORGANIZATION_AVATAR_TONE_CLASSES,
  type OrganizationAvatarSizeClasses,
} from './constants';
import type { OrganizationAvatarSize } from './models';

/**
 * Function toneIndex
 *
 * @description
 * Picks a tone for a name, deterministically: the same organization keeps the
 * same colour on every screen and across reloads, which is the whole point of
 * colouring an identity rather than decorating it.
 *
 * A plain character-code sum is enough here — the set is ten wide and the
 * inputs are organization names, so an even spread matters more than
 * avalanche behaviour, and a readable function beats a hash nobody can check.
 *
 * @access private
 * @since 1.0.0
 *
 * @param {string} value - The organization name.
 *
 * @returns {number} An index into the tone table.
 */
function toneIndex(value: string): number {
  let sum: number = 0;
  for (let index: number = 0; index < value.length; index++) sum += value.charCodeAt(index);

  return sum % ORGANIZATION_AVATAR_TONE_CLASSES.length;
}

/**
 * Component OrganizationAvatar
 * @class OrganizationAvatar
 *
 * @description
 * An organization's mark: its logo when it has one, its tinted initials
 * otherwise. Square-cornered, because an organization is not a person — and
 * that squareness is the reason this component exists.
 *
 * The spartan primitive splits an avatar across three elements and hardcodes
 * `rounded-full` on each: the root, the `::after` ring it draws its border
 * with, and the image. A caller overriding only the root and the fallback —
 * which is what every call site here did — got a rounded square wrapped in a
 * circular ring, and a circular logo. The primitive is vendored and not ours
 * to change, so the three radii are kept in agreement here instead, once.
 *
 * Owned by `organization` rather than `shared` because it knows what an
 * organization mark is: it derives initials with the feature's own
 * {@link getOrganizationInitials}, and it colours them from the name.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-avatar',
  imports: [HlmAvatar, HlmAvatarFallback, HlmAvatarImage],
  templateUrl: './organization-avatar.component.html',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationAvatar {
  //#region Inputs
  /**
   * Property name
   * @readonly
   * @description The organization's name — the image's alt text, and what both the initials and the tone are derived from.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string>}
   */
  public readonly name: InputSignal<string> = input.required<string>();

  /**
   * Property logoUrl
   * @readonly
   * @description The organization's logo, when it has one. Absent falls back to tinted initials.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string | null | undefined>}
   */
  public readonly logoUrl: InputSignal<string | null | undefined> = input<
    string | null | undefined
  >(null);

  /**
   * Property initials
   * @readonly
   * @description Overrides the initials derived from {@link name}, for a caller whose API already carries them.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string | null | undefined>}
   */
  public readonly initials: InputSignal<string | null | undefined> = input<
    string | null | undefined
  >(null);

  /**
   * Property size
   * @readonly
   * @description Which of the four rungs to render at.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<OrganizationAvatarSize>}
   */
  public readonly size: InputSignal<OrganizationAvatarSize> = input<OrganizationAvatarSize>('sm');
  //#endregion

  //#region Properties
  /** The three agreeing class strings for the requested size. */
  protected readonly sizeClasses: Signal<OrganizationAvatarSizeClasses> =
    computed<OrganizationAvatarSizeClasses>(() => ORGANIZATION_AVATAR_SIZE_CLASSES[this.size()]);

  /** The initials to draw: the caller's, or the ones the name yields. */
  protected readonly resolvedInitials: Signal<string> = computed<string>(() => {
    const provided: string | null | undefined = this.initials();

    return provided !== null && provided !== undefined && provided.length > 0
      ? provided
      : getOrganizationInitials(this.name());
  });

  /** The tone this organization always takes. */
  protected readonly toneClasses: Signal<string> = computed<string>(
    () => ORGANIZATION_AVATAR_TONE_CLASSES[toneIndex(this.name())] ?? '',
  );
  //#endregion
}
