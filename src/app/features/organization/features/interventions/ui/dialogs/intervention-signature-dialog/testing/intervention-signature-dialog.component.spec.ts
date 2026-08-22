import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { InterventionSignatureDialog } from '../intervention-signature-dialog.component';

const content = (): HTMLElement =>
  document.querySelector('[data-testid="intervention-signature-dialog"]') as HTMLElement;
const inDialog = (selector: string): HTMLElement =>
  content().querySelector(selector) as HTMLElement;
const canvasEl = (): HTMLCanvasElement =>
  inDialog('[data-testid="intervention-signature-canvas"]') as HTMLCanvasElement;
const confirmButton = (): HTMLButtonElement =>
  inDialog('[data-testid="intervention-signature-confirm"]') as HTMLButtonElement;
const clearButton = (): HTMLButtonElement =>
  inDialog('[data-testid="intervention-signature-clear"]') as HTMLButtonElement;
const skipButton = (): HTMLButtonElement =>
  inDialog('[data-testid="intervention-signature-skip"]') as HTMLButtonElement;

const pointerEvent = (type: string, clientX = 10, clientY = 10): PointerEvent =>
  new PointerEvent(type, { clientX, clientY, pointerId: 1 });

const stubPointerCapture = (canvas: HTMLCanvasElement): void => {
  canvas.setPointerCapture = (): void => undefined;
  canvas.releasePointerCapture = (): void => undefined;
};

const draw = (canvas: HTMLCanvasElement): void => {
  canvas.dispatchEvent(pointerEvent('pointerdown'));
  canvas.dispatchEvent(pointerEvent('pointermove', 20, 20));
  canvas.dispatchEvent(pointerEvent('pointerup', 20, 20));
};

describe('InterventionSignatureDialog', () => {
  let fixture: ComponentFixture<InterventionSignatureDialog>;
  let signed: Blob[];
  let dismissed: number;

  const setVisible = async (visible: boolean): Promise<void> => {
    fixture.componentRef.setInput('visible', visible);
    await fixture.whenStable();
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(InterventionSignatureDialog);
    await fixture.whenStable();

    signed = [];
    dismissed = 0;
    fixture.componentInstance.signed.subscribe((blob) => signed.push(blob));
    fixture.componentInstance.dismissed.subscribe(() => dismissed++);
  });

  it('should stay closed while not visible', () => {
    expect(content()).toBeNull();
  });

  it('should open when visible', async () => {
    await setVisible(true);

    expect(content()).not.toBeNull();
    expect(content().textContent).toContain('Capture the completion signature');
  });

  it('should disable Confirm and Clear until a stroke is drawn', async () => {
    await setVisible(true);
    stubPointerCapture(canvasEl());

    expect(confirmButton().disabled).toBe(true);
    expect((clearButton() as HTMLButtonElement).disabled).toBe(true);
  });

  it('should enable Confirm and Clear once a stroke is drawn', async () => {
    await setVisible(true);
    const canvas: HTMLCanvasElement = canvasEl();
    stubPointerCapture(canvas);

    draw(canvas);
    await fixture.whenStable();

    expect(confirmButton().disabled).toBe(false);
    expect((clearButton() as HTMLButtonElement).disabled).toBe(false);
  });

  it('should reset to disabled after Clear', async () => {
    await setVisible(true);
    const canvas: HTMLCanvasElement = canvasEl();
    stubPointerCapture(canvas);

    draw(canvas);
    await fixture.whenStable();
    clearButton().click();
    await fixture.whenStable();

    expect(confirmButton().disabled).toBe(true);
    expect((clearButton() as HTMLButtonElement).disabled).toBe(true);
  });

  it('should emit signed with a PNG blob on confirm', async () => {
    await setVisible(true);
    const canvas: HTMLCanvasElement = canvasEl();
    stubPointerCapture(canvas);
    const blob = new Blob(['signature'], { type: 'image/png' });
    canvas.toBlob = (callback: BlobCallback): void => callback(blob);

    draw(canvas);
    await fixture.whenStable();
    confirmButton().click();

    expect(signed).toEqual([blob]);
  });

  it('should emit dismissed on Skip without emitting signed', async () => {
    await setVisible(true);

    skipButton().click();

    expect(dismissed).toBe(1);
    expect(signed).toEqual([]);
  });

  it('should announce the signature as captured once a stroke is drawn', async () => {
    await setVisible(true);
    const canvas: HTMLCanvasElement = canvasEl();
    stubPointerCapture(canvas);

    expect(content().textContent).not.toContain('Signature captured');

    draw(canvas);
    await fixture.whenStable();

    expect(content().textContent).toContain('Signature captured');
  });

  it('should clear strokes when reopened', async () => {
    await setVisible(true);
    const canvas: HTMLCanvasElement = canvasEl();
    stubPointerCapture(canvas);
    draw(canvas);
    await fixture.whenStable();

    await setVisible(false);
    await setVisible(true);

    expect(confirmButton().disabled).toBe(true);
  });
});
