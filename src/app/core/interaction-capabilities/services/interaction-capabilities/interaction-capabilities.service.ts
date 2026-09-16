import { isPlatformBrowser, isPlatformServer } from '@angular/common';
import {
  afterNextRender,
  computed,
  DOCUMENT,
  inject,
  makeStateKey,
  PLATFORM_ID,
  REQUEST,
  Service,
  signal,
  type Signal,
  TransferState,
  type WritableSignal,
} from '@angular/core';
import type { InteractionModeEvidence } from '../../models/interaction-mode-evidence.interface';
import type { InteractionMode } from '../../models/interaction-mode.type';
import type { ShortcutModifier } from '../../models/shortcut-modifier.type';
import type { ShortcutPlatformEvidence } from '../../models/shortcut-platform-evidence.interface';
import type { InteractionCapabilitiesPort } from '../../ports';
import { classifyInteractionMode } from '../../utils/classify-interaction-mode/classify-interaction-mode.utils';
import { classifyServerInteractionMode } from '../../utils/classify-server-interaction-mode/classify-server-interaction-mode.utils';
import { resolveShortcutModifier } from '../../utils/shortcut-modifier/shortcut-modifier.utils';

/** Initial interaction mode serialized with Angular hydration state. */
export const INTERACTION_MODE_STATE_KEY = makeStateKey<InteractionMode>('interaction-mode');

/**
 * Service InteractionCapabilitiesService
 * @class InteractionCapabilitiesService
 * @description Seeds a conservative mode during SSR, transfers it through hydration, then reconciles
 * browser capabilities once. It neither persists device evidence nor treats viewport width as identity.
 * @version 1.0.0
 */
@Service()
export class InteractionCapabilitiesService implements InteractionCapabilitiesPort {
  //#region Properties
  /**
   * Property platformId
   * @readonly
   * @description Runtime platform used to separate request and browser evidence.
   * @access private
   * @since 1.0.0
   * @type {object}
   */
  private readonly platformId: object = inject<object>(PLATFORM_ID);

  /**
   * Property document
   * @readonly
   * @description Current browser or per-request server document.
   * @access private
   * @since 1.0.0
   * @type {Document}
   */
  private readonly document: Document = inject(DOCUMENT);

  /**
   * Property isBrowser
   * @readonly
   * @description Prevents browser capability access during server rendering.
   * @access private
   * @since 1.0.0
   * @type {boolean}
   */
  private readonly isBrowser: boolean = isPlatformBrowser(this.platformId);

  /**
   * Property request
   * @readonly
   * @description Optional per-request context, absent during prerender and in the browser.
   * @access private
   * @since 1.0.0
   * @type {Request | null}
   */
  private readonly request: Request | null = inject(REQUEST, { optional: true });

  /**
   * Property transferState
   * @readonly
   * @description Angular state bridge that keeps SSR and hydration on the same initial branch.
   * @access private
   * @since 1.0.0
   * @type {TransferState}
   */
  private readonly transferState: TransferState = inject(TransferState);

  /**
   * Property interactionModeState
   * @readonly
   * @description Stable mode state retained for the service lifetime.
   * @access private
   * @since 1.0.0
   * @type {WritableSignal<InteractionMode>}
   */
  private readonly interactionModeState: WritableSignal<InteractionMode> = signal(
    this.resolveInitialInteractionMode(),
  );

  /**
   * Property shortcutModifierState
   * @readonly
   * @description Hydration-safe modifier reconciled once browser platform evidence is available.
   * @access private
   * @since 1.0.0
   * @type {WritableSignal<ShortcutModifier>}
   */
  private readonly shortcutModifierState: WritableSignal<ShortcutModifier> = signal('Ctrl');

  /**
   * Property interactionMode
   * @readonly
   * @description Stable interaction mode snapshot; viewport and input events never change it.
   * @access public
   * @since 1.0.0
   * @type {Signal<InteractionMode>}
   */
  public readonly interactionMode: Signal<InteractionMode> = this.interactionModeState.asReadonly();

  /**
   * Property isMobileInteractionMode
   * @readonly
   * @description Whether controls use the phone and tablet interaction model.
   * @access public
   * @since 1.0.0
   * @type {Signal<boolean>}
   */
  public readonly isMobileInteractionMode: Signal<boolean> = computed(
    () => this.interactionMode() === 'mobile',
  );

  /**
   * Property shortcutModifier
   * @readonly
   * @description Platform modifier shared by all shortcut hints in the application shell.
   * @access public
   * @since 1.0.0
   * @type {Signal<ShortcutModifier>}
   */
  public readonly shortcutModifier: Signal<ShortcutModifier> =
    this.shortcutModifierState.asReadonly();

  //#endregion

  /**
   * Constructor
   * @constructor
   * @description Applies the hydration-safe initial mode and defers browser detection until rendering.
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    this.applyInteractionMode();
    if (!this.isBrowser) return;

    afterNextRender(() => {
      const detectedInteractionMode = this.detectInteractionMode();
      if (detectedInteractionMode !== null) this.interactionModeState.set(detectedInteractionMode);
      this.shortcutModifierState.set(this.detectShortcutModifier());
      this.applyInteractionMode();
    });
  }

  /**
   * Method resolveInitialInteractionMode
   * @method resolveInitialInteractionMode
   * @description Classifies request headers on the server and consumes their transferred result in the browser.
   * @access private
   * @since 1.0.0
   * @returns {InteractionMode} Mode used for the first rendered frame.
   */
  private resolveInitialInteractionMode(): InteractionMode {
    if (isPlatformServer(this.platformId)) {
      const interactionMode = classifyServerInteractionMode(this.request?.headers ?? null);
      this.transferState.set(INTERACTION_MODE_STATE_KEY, interactionMode);
      return interactionMode;
    }

    if (!this.isBrowser || !this.transferState.hasKey(INTERACTION_MODE_STATE_KEY)) {
      return 'desktop';
    }

    const interactionMode = this.transferState.get(INTERACTION_MODE_STATE_KEY, 'desktop');
    this.transferState.remove(INTERACTION_MODE_STATE_KEY);
    return interactionMode;
  }

  /**
   * Method detectInteractionMode
   * @method detectInteractionMode
   * @description Samples browser capabilities without retaining listeners. Missing or inaccessible
   * APIs preserve the transferred mode when a reliable snapshot cannot be read.
   * @access private
   * @since 1.0.0
   * @returns {InteractionMode | null} Automatic classification, or null when unavailable.
   */
  private detectInteractionMode(): InteractionMode | null {
    try {
      const browser = this.document.defaultView;
      if (!browser) return null;
      const navigator: Navigator & Pick<InteractionModeEvidence, 'userAgentData'> =
        browser.navigator;
      return classifyInteractionMode({
        platform: navigator.platform,
        userAgent: navigator.userAgent,
        userAgentData: navigator.userAgentData,
        maxTouchPoints: navigator.maxTouchPoints,
        anyPointerCoarse:
          typeof browser.matchMedia === 'function' &&
          browser.matchMedia('(any-pointer: coarse)').matches,
      });
    } catch {
      return null;
    }
  }

  /**
   * Method detectShortcutModifier
   * @method detectShortcutModifier
   * @description Resolves the shared shortcut label from browser evidence after hydration.
   * @access private
   * @since 1.0.0
   * @returns {ShortcutModifier} Browser modifier, defaulting to Ctrl when evidence is unavailable.
   */
  private detectShortcutModifier(): ShortcutModifier {
    try {
      const navigator: (Navigator & ShortcutPlatformEvidence) | undefined =
        this.document.defaultView?.navigator;
      return resolveShortcutModifier({
        platform: navigator?.platform,
        userAgent: navigator?.userAgent,
        userAgentData: navigator?.userAgentData,
      });
    } catch {
      return 'Ctrl';
    }
  }

  /**
   * Method applyInteractionMode
   * @method applyInteractionMode
   * @description Synchronizes the root CSS variant when the current document has an HTML element.
   * @access private
   * @since 1.0.0
   * @returns {void}
   */
  private applyInteractionMode(): void {
    this.document.documentElement?.setAttribute('data-interaction-mode', this.interactionMode());
  }
}
