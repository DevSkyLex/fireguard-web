import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  LOCALE_ID,
  OnInit,
  signal,
  untracked,
  type EffectRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import type {
  UpdateCurrentUserProfileInput,
  UserLocale,
  UserProfileOutput,
} from '@features/account/models';
import { USER_LOCALE_OPTIONS } from '@features/account/options';
import { AccountProfileEditStore, UserStore } from '@features/account/state';
import { AccountAvatarPicker } from '@features/account/ui/components/account-avatar-picker';
import { AccountProfileForm, type AccountProfileFormValues } from '@features/account/ui/forms';

import { NgIcon } from '@ng-icons/core';
import { HlmBadge } from '@shared/ui/badge';
import { HlmButton } from '@shared/ui/button';
import { HlmEmptyImports } from '@shared/ui/empty';
import { HlmSkeleton } from '@shared/ui/skeleton';

import { HlmAvatarImports } from '@shared/ui/avatar';
import { HlmItemImports } from '@shared/ui/item';
/**
 * Component AccountProfilePage
 * @class AccountProfilePage
 *
 * @description
 * Your own profile: read-only by default, with an explicit control to change
 * the parts you own.
 *
 * The editable group is edited **in place**, next to the values being changed,
 * rather than in a dialog that would hide them (`ARCHITECTURE.md` §10.5). What
 * cannot be changed here — the address, the roles, the dates — is simply shown,
 * with no affordance implying otherwise.
 *
 * @version 2.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-account-profile-page',
  imports: [
    ...HlmAvatarImports,
    ...HlmItemImports,
    NgIcon,
    ...HlmEmptyImports,
    AccountAvatarPicker,
    AccountProfileForm,
    HlmBadge,
    HlmButton,
    HlmSkeleton,
  ],
  providers: [AccountProfileEditStore],
  templateUrl: './account-profile-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountProfilePage implements OnInit {
  //#region Properties
  /**
   * Property userStore
   * @readonly
   *
   * @description
   * Root-provided profile state, which every account surface reads from.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {UserStore}
   */
  protected readonly userStore: UserStore = inject<UserStore>(UserStore);

  /**
   * Property editStore
   * @readonly
   *
   * @description
   * Scoped workflow store owning the two mutations, so a half-finished edit
   * dies with the surface rather than following the reader around.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {AccountProfileEditStore}
   */
  protected readonly editStore: AccountProfileEditStore =
    inject<AccountProfileEditStore>(AccountProfileEditStore);

  /**
   * Property editing
   * @readonly
   *
   * @description
   * Whether the editable group is showing its form rather than its values.
   *
   * Local by design: it is an interaction state, not a fact about the account,
   * and nothing outside this surface has any business knowing it.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly editing: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property formValues
   * @readonly
   *
   * @description
   * The stored profile in the shape the form edits. Nulls become empty
   * strings, because an input cannot hold `null`.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<AccountProfileFormValues>}
   */
  protected readonly formValues: Signal<AccountProfileFormValues> = computed(
    (): AccountProfileFormValues => {
      const profile: UserProfileOutput | null = this.userStore.profile();

      return {
        firstName: profile?.firstName ?? '',
        lastName: profile?.lastName ?? '',
        locale: profile?.locale ?? 'system',
      };
    },
  );

  /**
   * Property displayName
   * @readonly
   *
   * @description
   * What to call the signed-in user, falling back to the address so the header
   * is never blank.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly displayName: Signal<string> = computed(
    (): string => this.userStore.displayName() ?? this.userStore.profile()?.email ?? '',
  );

  /**
   * Property localeLabel
   * @readonly
   *
   * @description
   * The chosen interface language, named rather than shown as its stored code:
   * `fr` is not a thing to display to a reader.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly localeLabel: Signal<string> = computed((): string => {
    const locale: UserLocale = this.userStore.profile()?.locale ?? 'system';

    return USER_LOCALE_OPTIONS.find((option): boolean => option.value === locale)?.label ?? '';
  });

  /**
   * Property roles
   * @readonly
   *
   * @description
   * The global roles the account holds, shown read-only: they are granted, not
   * chosen.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<ReadonlyArray<string>>}
   */
  protected readonly roles: Signal<ReadonlyArray<string>> = computed((): ReadonlyArray<string> =>
    this.userStore.roles(),
  );

  /**
   * Property profileReady
   * @readonly
   *
   * @description
   * Whether the profile has landed. Nothing renders before it has: the form
   * seeds itself from the profile, so an absent one would present empty fields
   * as though they were the stored values — and a save would then persist them.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly profileReady: Signal<boolean> = computed(
    (): boolean => this.userStore.profile() !== null,
  );

  /**
   * Property hasProfileError
   * @readonly
   *
   * @description
   * Whether the profile could not be fetched at all, as opposed to still being
   * on its way. Only one of the two is worth offering a retry for.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly hasProfileError: Signal<boolean> = computed(
    (): boolean => this.userStore.profile() === null && this.userStore.loadError() !== null,
  );

  /**
   * Property emailVerified
   * @readonly
   *
   * @description
   * Whether the address has been confirmed. Worth surfacing here because an
   * unconfirmed address silently breaks the password change, which delivers its
   * code by email.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly emailVerified: Signal<boolean> = computed(
    (): boolean => this.userStore.profile()?.emailVerified ?? false,
  );

  /**
   * Property memberSince
   * @readonly
   *
   * @description
   * When the account was created, or `null` when the backend omitted it.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {Signal<string | null>}
   */
  protected readonly memberSince: Signal<string | null> = computed((): string | null =>
    this.formatDate(this.userStore.profile()?.createdAt),
  );

  /**
   * Property lastSignIn
   * @readonly
   *
   * @description
   * The last recorded sign-in. Shown because an unfamiliar time here is how
   * someone notices an account being used that is not them.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {Signal<string | null>}
   */
  protected readonly lastSignIn: Signal<string | null> = computed((): string | null =>
    this.formatDate(this.userStore.profile()?.lastLoginAt),
  );

  /**
   * Property locale
   * @readonly
   *
   * @description
   * The application's language, used to format the two timestamps so they read
   * in the language the rest of the interface is in.
   *
   * @access private
   * @since 1.1.0
   *
   * @type {string}
   */
  private readonly locale: string = inject<string>(LOCALE_ID);

  /**
   * Property previousSaveStatus
   *
   * @description
   * The save call state as of the last time {@link leaveEditOnSave} ran, so it
   * can spot the transition into success rather than the state of being in it.
   *
   * @access private
   * @since 2.0.0
   *
   * @type {string}
   */
  private previousSaveStatus: string = 'idle';
  //#endregion

  //#region Lifecycle
  /**
   * Property leaveEditOnSave
   * @readonly
   *
   * @description
   * Returns to the read-only view once a save lands.
   *
   * Keyed on the **transition** into success rather than on being in it: the
   * call state stays `success` afterwards, so a plain equality check would slam
   * the form shut the instant the reader reopened it.
   *
   * @access private
   * @since 2.0.0
   */
  private readonly leaveEditOnSave: EffectRef = effect((): void => {
    const status: string = this.editStore.saveCallState().status;
    const previous: string = this.previousSaveStatus;
    this.previousSaveStatus = status;

    if (previous !== 'pending' || status !== 'success') return;

    untracked((): void => this.editing.set(false));
  });
  //#endregion

  //#region Methods
  /**
   * Method ngOnInit
   * @method ngOnInit
   *
   * @description
   * Makes sure the profile this shows is on its way. `load()` filters itself
   * out when the profile is already loaded or in flight, so this cannot
   * duplicate the bootstrap fetch — it only covers the case where that one
   * failed (`ARCHITECTURE.md` §12.3).
   *
   * @access public
   * @since 1.1.0
   *
   * @returns {void}
   */
  public ngOnInit(): void {
    this.userStore.load();
  }

  /**
   * Method startEditing
   * @method startEditing
   *
   * @description
   * Swaps the editable group for its form.
   *
   * @access protected
   * @since 2.0.0
   *
   * @returns {void}
   */
  protected startEditing(): void {
    this.editing.set(true);
  }

  /**
   * Method cancelEditing
   * @method cancelEditing
   *
   * @description
   * Abandons the edit. Nothing needs undoing: the form seeds itself from the
   * stored profile every time it is shown, so reopening it starts from the
   * saved values rather than from the abandoned draft.
   *
   * @access protected
   * @since 2.0.0
   *
   * @returns {void}
   */
  protected cancelEditing(): void {
    this.editing.set(false);
  }

  /**
   * Method retryProfile
   * @method retryProfile
   *
   * @description
   * Fetches the profile again after a failure. `reload()` rather than `load()`,
   * because the latter filters itself out while the call state still holds the
   * error.
   *
   * @access protected
   * @since 1.1.0
   *
   * @returns {void}
   */
  protected retryProfile(): void {
    this.userStore.reload();
  }

  /**
   * Method save
   * @method save
   *
   * @description
   * Maps the form values onto the API contract and hands them to the store.
   *
   * An emptied name is sent as `null` rather than as `''`: under merge-patch,
   * `null` clears the field while `''` is a blank name the API rejects, and
   * omitting it entirely would silently keep the old value the user just
   * deleted.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {AccountProfileFormValues} values - What the user typed.
   *
   * @returns {void}
   */
  protected save(values: AccountProfileFormValues): void {
    const input: UpdateCurrentUserProfileInput = {
      firstName: values.firstName.trim() || null,
      lastName: values.lastName.trim() || null,
      locale: values.locale,
    };

    this.editStore.save(input);
  }

  /**
   * Method uploadAvatar
   * @method uploadAvatar
   *
   * @description
   * Sends the chosen picture. The picker has already rejected anything the
   * endpoint would refuse.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {File} file - The accepted image.
   *
   * @returns {void}
   */
  protected uploadAvatar(file: File): void {
    this.editStore.uploadAvatar(file);
  }

  /**
   * Method formatDate
   * @method formatDate
   *
   * @description
   * Renders an API timestamp as a readable date. Uses the platform's `Intl`
   * rather than a date library: nothing else in the application formats dates
   * yet, and two call sites do not justify introducing one
   * (`ARCHITECTURE.md` §2.9).
   *
   * @access private
   * @since 1.1.0
   *
   * @param {string | null | undefined} iso - ISO-8601 timestamp, if any.
   *
   * @returns {string | null} The formatted date, or `null` when there is none.
   */
  private formatDate(iso: string | null | undefined): string | null {
    if (!iso) return null;

    const parsed: number = Date.parse(iso);
    if (Number.isNaN(parsed)) return null;

    return new Intl.DateTimeFormat(this.locale, { dateStyle: 'long' }).format(parsed);
  }
  //#endregion
}
