import {
  ChangeDetectionStrategy,
  Component,
  provideZonelessChangeDetection,
  viewChild,
  type Signal,
  type TemplateRef,
} from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { PlanViewerOverlayContext } from '../../../../models/plan-viewer-overlay-context.interface';
import { PlanViewer } from '../plan-viewer.component';

const VIEWPORT_RECT: DOMRect = {
  width: 800,
  height: 600,
  left: 0,
  top: 0,
  right: 800,
  bottom: 600,
  x: 0,
  y: 0,
  toJSON: () => ({}),
};

/**
 * Stubs the inner frame's `getBoundingClientRect`, since jsdom never lays
 * anything out — every zoom/pan calculation reads the frame's live size.
 */
function stubViewportRect(fixture: ComponentFixture<PlanViewer>): void {
  const frame: HTMLElement = fixture.nativeElement.querySelector(
    '[data-testid="plan-viewer-frame"]',
  );
  frame.getBoundingClientRect = (): DOMRect => VIEWPORT_RECT;
}

/**
 * Fires the `<img>`'s `load` event with a fixed natural size, driving the
 * component out of its loading state the way the browser would.
 */
async function loadImage(
  fixture: ComponentFixture<PlanViewer>,
  size: { width: number; height: number } = { width: 800, height: 600 },
): Promise<void> {
  const image: HTMLImageElement = fixture.nativeElement.querySelector('img');
  Object.defineProperty(image, 'naturalWidth', { value: size.width, configurable: true });
  Object.defineProperty(image, 'naturalHeight', { value: size.height, configurable: true });
  image.dispatchEvent(new Event('load'));
  await fixture.whenStable();
}

@Component({
  selector: 'app-plan-viewer-overlay-host',
  imports: [PlanViewer],
  template: `
    <app-plan-viewer
      src="plan.png"
      alt="Ground floor plan"
      [overlayTemplate]="pinsTemplate() ?? null"
    />
    <ng-template #pins let-scale="scale">
      <span data-testid="overlay-marker">pin at {{ scale }}</span>
    </ng-template>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class OverlayHost {
  public readonly pinsTemplate: Signal<TemplateRef<PlanViewerOverlayContext> | undefined> =
    viewChild<TemplateRef<PlanViewerOverlayContext>>('pins');
}

describe('PlanViewer', () => {
  let fixture: ComponentFixture<PlanViewer>;
  let notifyResize: () => void;
  let observe: ReturnType<typeof vi.fn<ResizeObserver['observe']>>;
  let disconnect: ReturnType<typeof vi.fn<ResizeObserver['disconnect']>>;

  beforeEach(async () => {
    observe = vi.fn<ResizeObserver['observe']>();
    disconnect = vi.fn<ResizeObserver['disconnect']>();
    vi.stubGlobal(
      'ResizeObserver',
      class implements ResizeObserver {
        public readonly observe = observe;
        public readonly disconnect = disconnect;
        public readonly unobserve = vi.fn();

        public constructor(callback: ResizeObserverCallback) {
          notifyResize = () => callback([], this);
        }
      },
    );
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(PlanViewer);
    fixture.componentRef.setInput('src', 'plan.png');
    fixture.componentRef.setInput('alt', 'Ground floor plan');
    await fixture.whenStable();
    stubViewportRect(fixture);
  });

  afterEach(() => {
    fixture.destroy();
    vi.unstubAllGlobals();
  });

  /**
   * Function pointer
   * @description Delivers pointer coordinates through the rendered stage's native event bindings.
   * @param {string} type - Browser pointer event name.
   * @param {number} pointerId - Identity of the active contact.
   * @param {number} clientX - Horizontal screen position.
   * @param {number} clientY - Vertical screen position.
   * @returns {void}
   */
  function pointer(type: string, pointerId: number, clientX: number, clientY: number): void {
    const stage: HTMLElement = fixture.nativeElement.querySelector(
      '[data-testid="plan-viewer-stage"]',
    );
    const event = new MouseEvent(type, { clientX, clientY, bubbles: true });
    Object.defineProperty(event, 'pointerId', { value: pointerId });
    stage.dispatchEvent(event);
  }

  describe('loading and error', () => {
    it('should render the SSR-safe plain image with a skeleton before loading', () => {
      const skeleton: HTMLElement = fixture.nativeElement.querySelector(
        '[data-testid="plan-viewer-skeleton"]',
      );
      const content: HTMLElement = fixture.nativeElement.querySelector(
        '[data-testid="plan-viewer-content"]',
      );

      expect(skeleton).not.toBeNull();
      expect(skeleton.getAttribute('role')).toBe('status');
      expect(skeleton.getAttribute('aria-label')).not.toBeNull();
      expect(content.style.transform).toBe('');
      expect(content.style.width).toBe('');
    });

    it('should switch to the loaded state and fit the image once it loads', async () => {
      await loadImage(fixture);

      const content: HTMLElement = fixture.nativeElement.querySelector(
        '[data-testid="plan-viewer-content"]',
      );

      expect(
        fixture.nativeElement.querySelector('[data-testid="plan-viewer-skeleton"]'),
      ).toBeNull();
      expect(content.style.transform).toContain('scale(1)');
    });

    it('should show a localized error message when the image fails to load', async () => {
      const image: HTMLImageElement = fixture.nativeElement.querySelector('img');
      image.dispatchEvent(new Event('error'));
      await fixture.whenStable();

      const error: HTMLElement = fixture.nativeElement.querySelector(
        '[data-testid="plan-viewer-error"]',
      );
      expect(error).not.toBeNull();
      expect(error.getAttribute('role')).toBe('alert');
    });

    it('should clip on the outer viewport only, leaving the inner frame unclipped for focus rings', () => {
      const stage: HTMLElement = fixture.nativeElement.querySelector(
        '[data-testid="plan-viewer-stage"]',
      );
      const frame: HTMLElement = fixture.nativeElement.querySelector(
        '[data-testid="plan-viewer-frame"]',
      );

      expect(stage.classList.contains('overflow-hidden')).toBe(true);
      expect(frame.classList.contains('overflow-hidden')).toBe(false);
      expect(frame.classList.contains('inset-1')).toBe(true);
    });
  });

  describe('zoom buttons', () => {
    beforeEach(async () => {
      await loadImage(fixture);
    });

    it('should zoom in around the viewport center on click', async () => {
      const button: HTMLButtonElement = fixture.nativeElement.querySelector(
        '[data-testid="plan-viewer-zoom-in"]',
      );
      button.click();
      await fixture.whenStable();

      const content: HTMLElement = fixture.nativeElement.querySelector(
        '[data-testid="plan-viewer-content"]',
      );
      expect(content.style.transform).toContain('scale(1.25)');
    });

    it('should zoom out around the viewport center on click', async () => {
      const button: HTMLButtonElement = fixture.nativeElement.querySelector(
        '[data-testid="plan-viewer-zoom-out"]',
      );
      button.click();
      await fixture.whenStable();

      const content: HTMLElement = fixture.nativeElement.querySelector(
        '[data-testid="plan-viewer-content"]',
      );
      expect(content.style.transform).toContain(`scale(${1 / 1.25})`);
    });

    it('should restore the fitted transform on reset', async () => {
      const zoomIn: HTMLButtonElement = fixture.nativeElement.querySelector(
        '[data-testid="plan-viewer-zoom-in"]',
      );
      zoomIn.click();
      await fixture.whenStable();

      const reset: HTMLButtonElement = fixture.nativeElement.querySelector(
        '[data-testid="plan-viewer-zoom-reset"]',
      );
      reset.click();
      await fixture.whenStable();

      const content: HTMLElement = fixture.nativeElement.querySelector(
        '[data-testid="plan-viewer-content"]',
      );
      expect(content.style.transform).toBe('translate(0px, 0px) scale(1)');
    });
  });

  describe('wheel zoom', () => {
    beforeEach(async () => {
      await loadImage(fixture);
    });

    it('should zoom in on a negative deltaY and keep the cursor point anchored', async () => {
      const stage: HTMLElement = fixture.nativeElement.querySelector(
        '[data-testid="plan-viewer-stage"]',
      );
      const before = stage.querySelector('[data-testid="plan-viewer-content"]') as HTMLElement;
      expect(before.style.transform).toContain('scale(1)');

      stage.focus();
      const event = new WheelEvent('wheel', { deltaY: -100, clientX: 600, clientY: 500 });
      stage.dispatchEvent(event);
      await fixture.whenStable();

      const after: HTMLElement = fixture.nativeElement.querySelector(
        '[data-testid="plan-viewer-content"]',
      );
      expect(after.style.transform).toContain('scale(1.1)');
    });

    it('should zoom out on a positive deltaY', async () => {
      const stage: HTMLElement = fixture.nativeElement.querySelector(
        '[data-testid="plan-viewer-stage"]',
      );
      stage.focus();
      const event = new WheelEvent('wheel', { deltaY: 100, clientX: 400, clientY: 300 });
      stage.dispatchEvent(event);
      await fixture.whenStable();

      const content: HTMLElement = fixture.nativeElement.querySelector(
        '[data-testid="plan-viewer-content"]',
      );
      expect(content.style.transform).toContain(`scale(${1 / 1.1})`);
    });

    it('should leave the wheel event alone while the stage is not focused', async () => {
      const stage: HTMLElement = fixture.nativeElement.querySelector(
        '[data-testid="plan-viewer-stage"]',
      );
      const event = new WheelEvent('wheel', {
        deltaY: -100,
        clientX: 600,
        clientY: 500,
        cancelable: true,
      });
      stage.dispatchEvent(event);
      await fixture.whenStable();

      const content: HTMLElement = fixture.nativeElement.querySelector(
        '[data-testid="plan-viewer-content"]',
      );
      expect(event.defaultPrevented).toBe(false);
      expect(content.style.transform).toContain('scale(1)');
    });

    it('should consume the wheel event once the stage is focused', async () => {
      const stage: HTMLElement = fixture.nativeElement.querySelector(
        '[data-testid="plan-viewer-stage"]',
      );
      stage.focus();
      const event = new WheelEvent('wheel', {
        deltaY: -100,
        clientX: 600,
        clientY: 500,
        cancelable: true,
      });
      stage.dispatchEvent(event);
      await fixture.whenStable();

      expect(event.defaultPrevented).toBe(true);
    });
  });

  describe('keyboard interactions', () => {
    beforeEach(async () => {
      await loadImage(fixture);
    });

    it('should zoom in on "+"', async () => {
      const stage: HTMLElement = fixture.nativeElement.querySelector(
        '[data-testid="plan-viewer-stage"]',
      );
      stage.dispatchEvent(new KeyboardEvent('keydown', { key: '+' }));
      await fixture.whenStable();

      const content: HTMLElement = fixture.nativeElement.querySelector(
        '[data-testid="plan-viewer-content"]',
      );
      expect(content.style.transform).toContain('scale(1.25)');
    });

    it('should reset on "0"', async () => {
      const stage: HTMLElement = fixture.nativeElement.querySelector(
        '[data-testid="plan-viewer-stage"]',
      );
      stage.dispatchEvent(new KeyboardEvent('keydown', { key: '+' }));
      await fixture.whenStable();
      stage.dispatchEvent(new KeyboardEvent('keydown', { key: '0' }));
      await fixture.whenStable();

      const content: HTMLElement = fixture.nativeElement.querySelector(
        '[data-testid="plan-viewer-content"]',
      );
      expect(content.style.transform).toBe('translate(0px, 0px) scale(1)');
    });

    it('should pan on ArrowRight', async () => {
      const stage: HTMLElement = fixture.nativeElement.querySelector(
        '[data-testid="plan-viewer-stage"]',
      );
      stage.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
      await fixture.whenStable();

      const content: HTMLElement = fixture.nativeElement.querySelector(
        '[data-testid="plan-viewer-content"]',
      );
      expect(content.style.transform).toContain('translate(48px, 0px)');
    });

    it.each([
      ['ArrowLeft', 'translate(-48px, 0px) scale(1)'],
      ['ArrowUp', 'translate(0px, -48px) scale(1)'],
      ['ArrowDown', 'translate(0px, 48px) scale(1)'],
      ['-', 'translate(0px, 0px) scale(0.8)'],
      ['_', 'translate(0px, 0px) scale(0.8)'],
      ['=', 'translate(0px, 0px) scale(1.25)'],
    ])('consumes %s and updates the visible plan', async (key, transform) => {
      const stage: HTMLElement = fixture.nativeElement.querySelector(
        '[data-testid="plan-viewer-stage"]',
      );
      const event = new KeyboardEvent('keydown', { key, cancelable: true });
      stage.dispatchEvent(event);
      await fixture.whenStable();
      expect(event.defaultPrevented).toBe(true);
      expect(
        fixture.nativeElement.querySelector('[data-testid="plan-viewer-content"]').style.transform,
      ).toBe(transform);
    });
  });

  describe('pointer gestures and resize lifecycle', () => {
    let stage: HTMLElement;
    let frame: HTMLElement;
    let content: HTMLElement;
    let capture: ReturnType<typeof vi.fn<HTMLElement['setPointerCapture']>>;

    beforeEach(() => {
      stage = fixture.nativeElement.querySelector('[data-testid="plan-viewer-stage"]');
      frame = fixture.nativeElement.querySelector('[data-testid="plan-viewer-frame"]');
      content = fixture.nativeElement.querySelector('[data-testid="plan-viewer-content"]');
      capture = vi.fn<HTMLElement['setPointerCapture']>();
      stage.setPointerCapture = capture;
    });

    it('leaves gestures and keys untouched until the image has loaded', async () => {
      stage.focus();
      const wheel = new WheelEvent('wheel', { deltaY: -100, cancelable: true });
      const key = new KeyboardEvent('keydown', { key: '+', cancelable: true });
      stage.dispatchEvent(wheel);
      stage.dispatchEvent(key);
      pointer('pointerdown', 1, 100, 100);
      pointer('pointermove', 1, 200, 200);
      notifyResize();
      await fixture.whenStable();
      expect(capture).not.toHaveBeenCalled();
      expect(wheel.defaultPrevented).toBe(false);
      expect(key.defaultPrevented).toBe(false);
      expect(content.style.transform).toBe('');
      expect(stage.parentElement?.querySelector('button')?.disabled).toBe(true);
    });

    it.each(['pointerup', 'pointercancel', 'pointerleave'])(
      'stops dragging after %s and ignores an unrelated pointer',
      async (ending) => {
        await loadImage(fixture);
        pointer('pointermove', 9, 500, 500);
        pointer('pointerdown', 1, 100, 100);
        pointer('pointermove', 9, 500, 500);
        pointer('pointermove', 1, 160, 140);
        await fixture.whenStable();
        expect(capture).toHaveBeenCalledExactlyOnceWith(1);
        expect(content.style.transform).toBe('translate(60px, 40px) scale(1)');
        pointer(ending, 1, 160, 140);
        pointer('pointermove', 1, 600, 400);
        await fixture.whenStable();
        expect(content.style.transform).toBe('translate(60px, 40px) scale(1)');
      },
    );

    it('pinches around the frame-relative midpoint and caps zoom without shifting its anchor', async () => {
      fixture.componentRef.setInput('maxZoom', 2);
      frame.getBoundingClientRect = () => ({ ...VIEWPORT_RECT, left: 100, top: 50 });
      await loadImage(fixture);
      pointer('pointerdown', 1, 300, 250);
      pointer('pointerdown', 2, 500, 250);
      pointer('pointermove', 2, 700, 250);
      await fixture.whenStable();
      expect(content.style.transform).toBe('translate(100px, 100px) scale(2)');
      pointer('pointermove', 2, 900, 250);
      await fixture.whenStable();
      expect(content.style.transform).toBe('translate(100px, 100px) scale(2)');
      pointer('pointerup', 2, 900, 250);
      pointer('pointerup', 1, 300, 250);
      pointer('pointerdown', 3, 300, 250);
      pointer('pointermove', 3, 320, 260);
      await fixture.whenStable();
      expect(content.style.transform).toBe('translate(120px, 110px) scale(2)');
    });

    it('keeps part of the plan reachable when a pointer is dragged far outside the viewport', async () => {
      await loadImage(fixture);
      pointer('pointerdown', 1, 400, 300);
      pointer('pointermove', 1, 10_000, -10_000);
      await fixture.whenStable();
      expect(content.style.transform).toBe('translate(752px, -552px) scale(1)');
    });

    it('fits a large image below the normal minimum zoom and retains that reachable minimum', async () => {
      await loadImage(fixture, { width: 3200, height: 2400 });
      expect(content.style.transform).toBe('translate(0px, 0px) scale(0.25)');
      const zoomOut: HTMLButtonElement = fixture.nativeElement.querySelector(
        '[data-testid="plan-viewer-zoom-out"]',
      );
      zoomOut.click();
      await fixture.whenStable();
      expect(content.style.transform).toBe('translate(0px, 0px) scale(0.25)');
    });

    it('refits on container resize until an operator zooms, then reset uses the latest fit', async () => {
      await loadImage(fixture);
      expect(observe).toHaveBeenCalledExactlyOnceWith(frame);
      frame.getBoundingClientRect = () => ({ ...VIEWPORT_RECT, width: 400, height: 300 });
      notifyResize();
      await fixture.whenStable();
      expect(content.style.transform).toBe('translate(0px, 0px) scale(0.5)');
      const zoomIn: HTMLButtonElement = fixture.nativeElement.querySelector(
        '[data-testid="plan-viewer-zoom-in"]',
      );
      zoomIn.click();
      await fixture.whenStable();
      expect(content.style.transform).toBe('translate(0px, 0px) scale(0.625)');
      frame.getBoundingClientRect = () => VIEWPORT_RECT;
      notifyResize();
      await fixture.whenStable();
      expect(content.style.transform).toBe('translate(0px, 0px) scale(0.625)');
      const reset: HTMLButtonElement = fixture.nativeElement.querySelector(
        '[data-testid="plan-viewer-zoom-reset"]',
      );
      reset.click();
      await fixture.whenStable();
      expect(content.style.transform).toBe('translate(0px, 0px) scale(1)');
      fixture.destroy();
      expect(disconnect).toHaveBeenCalledOnce();
    });
  });
});

describe('PlanViewer overlay projection', () => {
  let fixture: ComponentFixture<OverlayHost>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OverlayHost],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(OverlayHost);
    await fixture.whenStable();
  });

  it('should render the projected overlay inside the transformed stage, with the current scale', async () => {
    const frame: HTMLElement = fixture.nativeElement.querySelector(
      '[data-testid="plan-viewer-frame"]',
    );
    frame.getBoundingClientRect = (): DOMRect => VIEWPORT_RECT;

    const image: HTMLImageElement = fixture.nativeElement.querySelector('img');
    Object.defineProperty(image, 'naturalWidth', { value: 800, configurable: true });
    Object.defineProperty(image, 'naturalHeight', { value: 600, configurable: true });
    image.dispatchEvent(new Event('load'));
    await fixture.whenStable();

    const content: HTMLElement = fixture.nativeElement.querySelector(
      '[data-testid="plan-viewer-content"]',
    );
    const marker: HTMLElement | null = content.querySelector('[data-testid="overlay-marker"]');

    expect(marker).not.toBeNull();
    expect(marker?.textContent).toContain('pin at 1');
  });
});
