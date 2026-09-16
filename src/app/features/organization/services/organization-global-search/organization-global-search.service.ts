import { isPlatformBrowser } from '@angular/common';
import {
  afterNextRender,
  computed,
  DestroyRef,
  DOCUMENT,
  effect,
  inject,
  PLATFORM_ID,
  Service,
  signal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { fromEvent, take } from 'rxjs';
import {
  INTERACTION_CAPABILITIES_PORT,
  type InteractionCapabilitiesPort,
  type ShortcutModifier,
} from '@core/interaction-capabilities';
import { AUTH_SESSION_PORT, type AuthSessionPort } from '@features/auth/ports';
import {
  ActiveOrganizationStore,
  type ActiveOrganizationStoreType,
} from '@features/organization/state';
import { OrganizationGlobalSearchDialog } from '@features/organization/ui/dialogs/organization-global-search-dialog';
import { HlmDialogService } from '@shared/ui/dialog';

/**
 * Service OrganizationGlobalSearchService
 * @class OrganizationGlobalSearchService
 *
 * @description
 * Owns the organization's browser shortcut and single native search dialog independently
 * of portaled slot triggers. Query state belongs to each dialog instance, never this service.
 *
 * @since 1.0.0
 */
@Service()
export class OrganizationGlobalSearchService {
  //#region Properties
  /**
   * Property interactionCapabilities
   * @readonly
   * @description Shared interaction mode and platform shortcut convention.
   * @access private
   * @since 1.0.0
   * @type {InteractionCapabilitiesPort}
   */
  private readonly interactionCapabilities: InteractionCapabilitiesPort = inject(
    INTERACTION_CAPABILITIES_PORT,
  );

  /**
   * Property document
   * @readonly
   * @description Browser event target, accessed only after hydration or a browser-only opening.
   * @access private
   * @since 1.0.0
   * @type {Document}
   */
  private readonly document: Document = inject(DOCUMENT);

  /**
   * Property isBrowser
   * @readonly
   * @description Prevents imperative dialog creation in every server rendering context.
   * @access private
   * @since 1.0.0
   * @type {boolean}
   */
  private readonly isBrowser: boolean = isPlatformBrowser(inject(PLATFORM_ID));

  /**
   * Property destroyRef
   * @readonly
   * @description Lifetime of the owner, including its listener and pending parent dismissal.
   * @access private
   * @since 1.0.0
   * @type {DestroyRef}
   */
  private readonly destroyRef: DestroyRef = inject(DestroyRef);

  /**
   * Property organizationContext
   * @readonly
   * @description Makes both shortcut and trigger inactive without an organization.
   * @access private
   * @since 1.0.0
   * @type {ActiveOrganizationStoreType}
   */
  private readonly organizationContext: ActiveOrganizationStoreType =
    inject(ActiveOrganizationStore);

  /**
   * Property authSession
   * @readonly
   * @description A remembered organization cannot enable protected search before login/MFA finish.
   * @access private
   * @since 1.0.0
   * @type {AuthSessionPort}
   */
  private readonly authSession: AuthSessionPort = inject(AUTH_SESSION_PORT);

  /**
   * Property dialogs
   * @readonly
   * @description Native Spartan dialog creation, dismissal and focus management.
   * @access private
   * @since 1.0.0
   * @type {HlmDialogService}
   */
  private readonly dialogs: HlmDialogService = inject(HlmDialogService);

  /**
   * Property dialogRef
   * @readonly
   * @description The only search palette, retained until native exit and disposal finish.
   * @access private
   * @since 1.0.0
   * @type {WritableSignal<BrnDialogRef<void> | null>}
   */
  private readonly dialogRef: WritableSignal<BrnDialogRef<void> | null> = signal(null);

  /**
   * Property paletteVisible
   * @readonly
   * @description Native dialog visibility advertised by any mounted trigger.
   * @access public
   * @since 1.0.0
   * @type {Signal<boolean>}
   */
  public readonly paletteVisible: Signal<boolean> = computed(
    () => this.dialogRef()?.state() === 'open',
  );

  /**
   * Property shortcutModifier
   * @readonly
   * @description Platform-specific modifier shared by remounted triggers.
   * @access public
   * @since 1.0.0
   * @type {Signal<ShortcutModifier>}
   */
  public readonly shortcutModifier: Signal<ShortcutModifier> =
    this.interactionCapabilities.shortcutModifier;

  /**
   * Property trigger
   * @description Optional live opener and its native parent; absent while quick actions are closed.
   * @access private
   * @since 1.0.0
   * @type {{ readonly element: HTMLElement; readonly parent: BrnDialogRef<unknown> | null } | null}
   */
  private trigger: {
    readonly element: HTMLElement;
    readonly parent: BrnDialogRef<unknown> | null;
  } | null = null;

  /**
   * Property isOpening
   * @description Serializes a parent dismissal before the search dialog can be created.
   * @access private
   * @since 1.0.0
   * @type {boolean}
   */
  private isOpening: boolean = false;
  //#endregion

  //#region Lifecycle
  /**
   * Constructor
   * @constructor
   * @description Installs one post-hydration listener and disposes the owned dialog on teardown.
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    effect(() => {
      if (!this.authSession.isAuthenticated()) this.dialogRef()?.close();
    });
    afterNextRender(() => {
      if (!this.isBrowser) return;
      fromEvent<KeyboardEvent>(this.document, 'keydown')
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((event) => this.onKeydown(event));
    });
    this.destroyRef.onDestroy(() => {
      this.dialogRef()?.forceClose();
      this.dialogRef.set(null);
      this.trigger = null;
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method registerTrigger
   * @method registerTrigger
   * @description Supplies native focus/parent context without making the shortcut depend on a view.
   * @access public
   * @since 1.0.0
   * @param {HTMLElement} element - The currently mounted organization search trigger.
   * @param {BrnDialogRef<unknown> | null} parent - Optional native dialog containing that trigger.
   * @returns {() => void} Cleanup owned by the trigger's render lifetime.
   */
  public registerTrigger(element: HTMLElement, parent: BrnDialogRef<unknown> | null): () => void {
    const trigger = { element, parent };
    this.trigger = trigger;
    return () => {
      if (this.trigger === trigger) this.trigger = null;
    };
  }

  /**
   * Method open
   * @method open
   * @description Opens once, after any native parent has closed and restored its own opener's focus.
   * @access public
   * @since 1.0.0
   * @returns {void}
   */
  public open(): void {
    const organizationId = this.organizationContext.selectedOrganizationId();
    if (
      !this.isBrowser ||
      this.destroyRef.destroyed ||
      !this.authSession.isAuthenticated() ||
      organizationId === null ||
      this.dialogRef() ||
      this.isOpening
    )
      return;

    const trigger = this.trigger?.element.isConnected ? this.trigger : null;
    if (trigger?.parent && trigger.parent.phase() !== 'closed') {
      this.isOpening = true;
      trigger.parent.closed$.pipe(take(1), takeUntilDestroyed(this.destroyRef)).subscribe(() => {
        this.isOpening = false;
        if (this.organizationContext.selectedOrganizationId() === organizationId) this.openDialog();
      });
      trigger.parent.close();
      return;
    }

    this.openDialog(trigger?.element);
  }

  /**
   * Method openDialog
   * @method openDialog
   * @description Creates the native palette; interaction mode changes never replace its query/store.
   * @access private
   * @since 1.0.0
   * @param {HTMLElement} [trigger] - Connected opener, otherwise native previously-focused restoration.
   * @returns {void}
   */
  private openDialog(trigger?: HTMLElement): void {
    if (!this.authSession.isAuthenticated()) return;
    const ref = this.dialogs.open<void>(OrganizationGlobalSearchDialog, {
      id: 'organization-global-search',
      contentClass:
        'h-[min(34rem,calc(100svh-2rem))] w-[min(42rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] gap-0 overflow-hidden p-0 sm:max-w-2xl mobile-ui:w-screen mobile-ui:max-w-none mobile-ui:h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom))] mobile-ui:rounded-none',
      showCloseButton: false,
      autoFocus: '#organization-global-search-query',
      restoreFocus: trigger ?? true,
    });
    this.dialogRef.set(ref);
    ref.closed$.pipe(take(1), takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (this.dialogRef() === ref) this.dialogRef.set(null);
    });
  }

  /**
   * Method onKeydown
   * @method onKeydown
   * @description Toggles Ctrl/Cmd+K, leaving editable fields and already-handled shortcuts untouched.
   * @access private
   * @since 1.0.0
   * @param {KeyboardEvent} event - Browser keyboard event; Escape remains entirely Spartan-owned.
   * @returns {void}
   */
  private onKeydown(event: KeyboardEvent): void {
    if (
      event.defaultPrevented ||
      event.repeat ||
      event.isComposing ||
      event.altKey ||
      event.shiftKey ||
      event.key.toLowerCase() !== 'k' ||
      !(event.ctrlKey || event.metaKey)
    )
      return;
    if (
      !this.authSession.isAuthenticated() ||
      this.organizationContext.selectedOrganizationId() === null
    )
      return;
    if (
      !this.dialogRef() &&
      event
        .composedPath()
        .some(
          (target) =>
            target instanceof HTMLElement &&
            (target.isContentEditable ||
              target.matches(
                'input, textarea, select, [role="textbox"], [contenteditable]:not([contenteditable="false"])',
              )),
        )
    )
      return;

    event.preventDefault();
    if (this.dialogRef()) this.dialogRef()?.close();
    else this.open();
  }
  //#endregion
}
