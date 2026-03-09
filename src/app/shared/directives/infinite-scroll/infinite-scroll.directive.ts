import {
  Directive,
  AfterViewInit,
  OnDestroy,
  ElementRef,
  inject,
  output,
  input,
  PLATFORM_ID,
  type InputSignal,
  type OutputEmitterRef,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Directive InfiniteScrollDirective
 * @class InfiniteScrollDirective
 *
 * @description
 * Observes a sentinel element placed at the bottom of a scrollable container.
 * When the sentinel enters the viewport (i.e. the user has scrolled near the
 * bottom), the `scrolled` output is emitted so the host component can load
 * more data.
 *
 * Uses the native `IntersectionObserver` API for efficient, passive
 * detection — no scroll-event polling.
 *
 * @since 1.1.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @example
 * ```html
 * <div class="overflow-y-auto max-h-80">
 *   @for (item of items(); track item.id) {
 *     <my-item [data]="item" />
 *   }
 *   <div appInfiniteScroll
 *        [disabled]="isLoading() || !hasMore()"
 *        (scrolled)="loadMore()"></div>
 * </div>
 * ```
 */
@Directive({ selector: '[appInfiniteScroll]' })
export class InfiniteScrollDirective implements AfterViewInit, OnDestroy {
  //#region Properties
  /**
   * Property disabled
   * @readonly
   *
   * @description
   * When true the observer stops emitting. Set this to `true` while
   * a request is in flight or when there are no more pages to load.
   *
   * @access public
   * @since 1.1.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly disabled: InputSignal<boolean> =
    input<boolean>(false);

  /**
   * Property rootMargin
   * @readonly
   *
   * @description
   * Margin around the root used by the IntersectionObserver.
   * A positive bottom margin (e.g. `'200px'`) triggers the callback
   * *before* the sentinel is fully visible, giving the network
   * request a head start.
   *
   * @access public
   * @since 1.1.0
   *
   * @type {InputSignal<string>}
   */
  public readonly rootMargin: InputSignal<string> =
    input<string>('200px');

  /**
   * Property scrolled
   * @readonly
   *
   * @description
   * Emitted every time the sentinel becomes visible and the
   * directive is not disabled.
   *
   * @access public
   * @since 1.1.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly scrolled: OutputEmitterRef<void> = output<void>();

  /**
   * Property element
   * @readonly
   *
   * @description
   * Reference to the host DOM element (the sentinel)
   * observed by the IntersectionObserver.
   *
   * @access private
   * @since 1.1.0
   *
   * @type {ElementRef<HTMLElement>}
   */
  private readonly element: ElementRef<HTMLElement> =
    inject<ElementRef>(ElementRef);

  /**
   * Property platformId
   * @readonly
   *
   * @description
   * Angular's platform identifier, used to conditionally disable the
   * IntersectionObserver on the server where `window` is not available.
   *
   * @access private
   * @since 1.1.0
   *
   * @type {object}
   */
  private readonly platformId: object =
    inject<object>(PLATFORM_ID);

  /**
   * Property observer
   * @description
   *
   * Instance of the IntersectionObserver
   * observing the host element.
   *
   * @access private
   * @since 1.1.0
   *
   * @type {IntersectionObserver | null}
   */
  private observer: IntersectionObserver | null = null;
  //#endregion

  //#region Lifecycle
  /**
   * Method ngAfterViewInit
   * @method ngAfterViewInit
   *
   * @description
   * Initializes the IntersectionObserver and starts observing the host element.
   * Does nothing on the server platform.
   *
   * @access public
   * @since 1.1.0
   *
   * @returns {void} No return value.
   */
  public ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.observer = new IntersectionObserver(
      (entries: IntersectionObserverEntry[]) => {
        const entry: IntersectionObserverEntry | undefined = entries[0];
        if (entry?.isIntersecting && !this.disabled()) {
          this.scrolled.emit();
        }
      },
      { rootMargin: `0px 0px ${this.rootMargin()} 0px` },
    );
    this.observer.observe(this.element.nativeElement);
  }

  /**
   * Method ngOnDestroy
   * @method ngOnDestroy
   *
   * @description
   * Disconnects the IntersectionObserver to prevent memory leaks when the
   * directive is destroyed.
   *
   * @access public
   * @since 1.1.0
   *
   * @return {void} No return value.
   */
  public ngOnDestroy(): void {
    const observer: IntersectionObserver | null = this.observer;
    if (observer) observer.disconnect();
    this.observer = null;
  }
  //#endregion
}
