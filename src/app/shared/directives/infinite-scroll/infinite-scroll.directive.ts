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
@Directive({
  selector: '[appInfiniteScroll]',
})
export class InfiniteScrollDirective implements AfterViewInit, OnDestroy {
  //#region Inputs
  /**
   * Input disabled
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
   * Input rootMargin
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
  //#endregion

  //#region Outputs
  /**
   * Output scrolled
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
  //#endregion

  //#region Properties
  private readonly el: ElementRef<HTMLElement> = inject(ElementRef);
  private readonly platformId: object = inject(PLATFORM_ID);
  private observer: IntersectionObserver | null = null;
  //#endregion

  //#region Lifecycle
  public ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.observer = new IntersectionObserver(
      (entries: IntersectionObserverEntry[]) => {
        const entry: IntersectionObserverEntry | undefined = entries[0];
        if (entry?.isIntersecting && !this.disabled()) {
          this.scrolled.emit();
        }
      },
      { rootMargin: `0px 0px ${this.rootMargin()} 0px` },
    );
    this.observer.observe(this.el.nativeElement);
  }

  public ngOnDestroy(): void {
    this.observer?.disconnect();
    this.observer = null;
  }
  //#endregion
}
