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

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(PlanViewer);
    fixture.componentRef.setInput('src', 'plan.png');
    fixture.componentRef.setInput('alt', 'Ground floor plan');
    await fixture.whenStable();
    stubViewportRect(fixture);
  });

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
