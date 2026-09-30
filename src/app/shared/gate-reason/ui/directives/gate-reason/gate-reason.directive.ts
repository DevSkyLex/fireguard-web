import {
  Directive,
  ElementRef,
  inject,
  input,
  Renderer2,
  untracked,
  type InputSignal,
  type OnDestroy,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { computed, effect, signal } from '@angular/core';

/**
 * Constant nextGateReasonSequence
 *
 * @description
 * Allocates matching page-local IDs during server rendering and client hydration.
 *
 * @access private
 * @since unreleased
 *
 * @type {number}
 */
let nextGateReasonSequence: number = 0;

/**
 * Function generateGateReasonId
 *
 * @description
 * Produces a stable, page-unique id for one directive instance. A plain
 * incrementing counter rather than `crypto.randomUUID()`: SSR and the
 * client hydrate the same component tree in the same order, so the counter
 * lands on the same id on both sides.
 *
 * @access private
 * @since 13.1.0
 *
 * @returns {string} A fresh `gate-reason-<n>` id.
 */
function generateGateReasonId(): string {
  nextGateReasonSequence += 1;
  return `gate-reason-${nextGateReasonSequence}`;
}

/**
 * Directive GateReasonDirective
 * @class GateReasonDirective
 *
 * @description
 * Makes a closed gate speak (`PRODUCT.md` principle 2): given a reason, it
 * links the host to a page-unique id through `aria-describedby` — appended
 * to any id already there, never overwriting a validation error the host
 * already describes — and exposes that id as {@link GateReasonDirective.reasonId}
 * so the call site renders the reason itself, exactly as
 * `intervention-status-band` and `filter-chip` already do by hand. The
 * directive never injects the visible node: it does not know where a
 * one-line reason fits in an arbitrary host's layout (a flex row, a card
 * footer), so it leaves that placement to the template that owns it.
 * A `null` or empty reason is inert — no id is generated, no attribute is
 * touched, and a previously attached id is detached.
 * Only `Renderer2`/`ElementRef` attribute access is used here, never
 * `document` or `window`, so no `isPlatformBrowser` guard is needed — this
 * runs identically during SSR and in the browser.
 *
 * @since 13.1.0
 */
@Directive({ selector: '[appGateReason]', exportAs: 'appGateReason' })
export class GateReasonDirective implements OnDestroy {
  //#region Inputs
  /**
   * Property appGateReason
   * @readonly
   *
   * @description
   * The reason the gate is closed, or `null`/empty when it is open. Reading
   * this input is what drives id generation and `aria-describedby` wiring.
   *
   * @access public
   * @since 13.1.0
   *
   * @type {InputSignal<string | null>}
   */
  public readonly appGateReason: InputSignal<string | null> = input<string | null>(null);
  //#endregion

  //#region Public API
  /**
   * Property reasonId
   * @readonly
   *
   * @description
   * The id the host's `aria-describedby` now includes, or `null` while the
   * directive is inert. The call site binds this to the visible node that
   * renders the reason text (`[id]="gateReason.reasonId()"`).
   *
   * @access public
   * @since 13.1.0
   *
   * @type {Signal<string | null>}
   */
  public readonly reasonId: Signal<string | null> = computed<string | null>(() =>
    this.appGateReason() ? this.generatedId() : null,
  );
  //#endregion

  //#region State
  /**
   * Property generatedId
   * @readonly
   *
   * @description
   * Retains the directive's stable ID while its reason remains active.
   *
   * @access private
   * @since unreleased
   *
   * @type {WritableSignal<string | null>}
   */
  private readonly generatedId: WritableSignal<string | null> = signal<string | null>(null);
  //#endregion

  //#region Dependencies
  /**
   * Property element
   * @readonly
   *
   * @description
   * Provides the host element whose described-by attribute the directive manages.
   *
   * @access private
   * @since unreleased
   *
   * @type {ElementRef<HTMLElement>}
   */
  private readonly element: ElementRef<HTMLElement> = inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * Property renderer
   * @readonly
   *
   * @description
   * Updates host attributes through Angular's SSR-safe rendering boundary.
   *
   * @access private
   * @since unreleased
   *
   * @type {Renderer2}
   */
  private readonly renderer: Renderer2 = inject(Renderer2);
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Connects reason changes to stable IDs and the host's accessible description.
   *
   * @access public
   * @since unreleased
   */
  constructor() {
    effect(() => {
      const reason: string | null = this.appGateReason();
      const previousId: string | null = untracked(this.generatedId);

      if (!reason) {
        if (previousId) {
          this.detachDescribedBy(previousId);
          this.generatedId.set(null);
        }
        return;
      }

      const id: string = previousId ?? generateGateReasonId();
      if (!previousId) {
        this.generatedId.set(id);
      }
      this.attachDescribedBy(id);
    });
  }
  //#endregion

  /**
   * Method ngOnDestroy
   * @method ngOnDestroy
   *
   * @description
   * Detaches the generated id from `aria-describedby` if the directive is
   * destroyed while a reason was still set, so a reused or recycled host
   * element is never left describing a reason that no longer applies.
   *
   * @access public
   * @since 13.1.0
   *
   * @returns {void}
   */
  public ngOnDestroy(): void {
    const id: string | null = untracked(this.generatedId);
    if (id) {
      this.detachDescribedBy(id);
    }
  }

  /**
   * Method attachDescribedBy
   * @method attachDescribedBy
   *
   * @description
   * Adds `id` to the host's `aria-describedby` token list, preserving any
   * id already present.
   *
   * @access private
   * @since 13.1.0
   *
   * @param {string} id The id to add.
   *
   * @returns {void}
   */
  private attachDescribedBy(id: string): void {
    const tokens: string[] = this.describedByTokens();
    if (tokens.includes(id)) {
      return;
    }
    tokens.push(id);
    this.renderer.setAttribute(this.element.nativeElement, 'aria-describedby', tokens.join(' '));
  }

  /**
   * Method detachDescribedBy
   * @method detachDescribedBy
   *
   * @description
   * Removes `id` from the host's `aria-describedby` token list, removing
   * the attribute entirely once no token is left.
   *
   * @access private
   * @since 13.1.0
   *
   * @param {string} id The id to remove.
   *
   * @returns {void}
   */
  private detachDescribedBy(id: string): void {
    const tokens: string[] = this.describedByTokens().filter(
      (token: string): boolean => token !== id,
    );
    if (tokens.length > 0) {
      this.renderer.setAttribute(this.element.nativeElement, 'aria-describedby', tokens.join(' '));
    } else {
      this.renderer.removeAttribute(this.element.nativeElement, 'aria-describedby');
    }
  }

  /**
   * Method describedByTokens
   * @method describedByTokens
   *
   * @description
   * Reads the host's current `aria-describedby` as its whitespace-separated
   * tokens.
   *
   * @access private
   * @since 13.1.0
   *
   * @returns {string[]} The current tokens, or an empty array when unset.
   */
  private describedByTokens(): string[] {
    const existing: string | null = this.element.nativeElement.getAttribute('aria-describedby');
    return existing ? existing.split(' ').filter((token: string): boolean => token.length > 0) : [];
  }
}
