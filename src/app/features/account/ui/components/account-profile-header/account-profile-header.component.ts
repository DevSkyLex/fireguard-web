import { DatePipe, TitleCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AvatarModule } from 'primeng/avatar';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { UserStore } from '@features/account/state';

/**
 * Component AccountProfileHeader
 * @class AccountProfileHeader
 *
 * @description
 * Hero header of the account page. Renders a decorative mesh-gradient banner
 * tinted with the active theme's primary color, an avatar overlapping the
 * bottom of the banner, and the authenticated user's main identity in
 * read-only form (display name, email, status, email verification, roles and
 * key timestamps). Rendered at the top of {@link AccountPage}.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-account-profile-header',
  imports: [DatePipe, TitleCasePipe, AvatarModule, SkeletonModule, TagModule],
  templateUrl: './account-profile-header.component.html',
  styles: [
    `
      .account-banner {
        background-color: var(--p-primary-500);
        background-image:
          radial-gradient(
            at 18% 22%,
            color-mix(in srgb, var(--p-primary-300) 90%, transparent) 0,
            transparent 55%
          ),
          radial-gradient(
            at 82% 8%,
            color-mix(in srgb, var(--p-primary-400) 80%, transparent) 0,
            transparent 50%
          ),
          radial-gradient(
            at 4% 60%,
            color-mix(in srgb, var(--p-primary-600) 75%, transparent) 0,
            transparent 55%
          ),
          radial-gradient(
            at 92% 90%,
            color-mix(in srgb, var(--p-primary-700) 70%, transparent) 0,
            transparent 50%
          ),
          radial-gradient(
            at 40% 100%,
            color-mix(in srgb, var(--p-primary-400) 65%, transparent) 0,
            transparent 50%
          );
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountProfileHeader {
  /**
   * Property userStore
   * @readonly
   *
   * @description
   * Authenticated user profile store exposed to the template for the avatar,
   * identity and read-only metadata.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {UserStore}
   */
  protected readonly userStore: UserStore = inject<UserStore>(UserStore);

  /**
   * Method statusDotClass
   * @method statusDotClass
   *
   * @description
   * Returns the Tailwind background token for the account status indicator dot.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} status - Account status returned by the backend.
   * @returns {string} Tailwind background color class.
   */
  protected statusDotClass(status: string): string {
    return status.toLowerCase() === 'active' ? 'bg-green-500' : 'bg-orange-500';
  }
}
