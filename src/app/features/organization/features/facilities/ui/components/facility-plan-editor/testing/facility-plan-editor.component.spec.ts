import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { FacilityPlanOverlayOutput } from '@features/organization/features/facilities/models';
import { FacilityPlanEditor } from '../facility-plan-editor.component';

const STAGE_RECT: DOMRect = {
  width: 1200,
  height: 800,
  left: 0,
  top: 0,
  right: 1200,
  bottom: 800,
  x: 0,
  y: 0,
  toJSON: () => ({}),
};

const overlay = (
  overrides: Partial<FacilityPlanOverlayOutput> = {},
): FacilityPlanOverlayOutput => ({
  attachmentId: 'plan-1',
  imageWidth: 1200,
  imageHeight: 800,
  zones: [],
  equipment: [
    {
      equipmentId: 'equipment-1',
      type: 'fire_extinguisher',
      serialNumber: 'SN-1',
      locationLabel: 'Extinguisher',
      status: 'operational',
      x: 0.5,
      y: 0.25,
    },
  ],
  ...overrides,
});

const pointerEvent = (type: string, clientX: number, clientY: number): PointerEvent =>
  new PointerEvent(type, { clientX, clientY, pointerId: 1 });

describe('FacilityPlanEditor', () => {
  let fixture: ComponentFixture<FacilityPlanEditor>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const byTestId = (id: string): HTMLElement | null =>
    root().querySelector(`[data-testid="${id}"]`);
  const allByTestId = (id: string): NodeListOf<HTMLElement> =>
    root().querySelectorAll(`[data-testid="${id}"]`);

  const stubStageRect = (): void => {
    const stage = byTestId('facility-plan-editor-stage') as HTMLElement;
    stage.getBoundingClientRect = (): DOMRect => STAGE_RECT;
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    fixture = TestBed.createComponent(FacilityPlanEditor);
    fixture.componentRef.setInput('overlay', overlay());
    await fixture.whenStable();
  });

  it('renders the read overlay and no stage without overlay data', async () => {
    fixture.componentRef.setInput('overlay', null);
    await fixture.whenStable();

    expect(byTestId('facility-plan-editor-stage')).toBeNull();
  });

  it('forwards zoneActivated and equipmentActivated from the wrapped overlay', async () => {
    fixture.componentRef.setInput('overlay', overlay());
    await fixture.whenStable();

    const activated: string[] = [];
    fixture.componentInstance.equipmentActivated.subscribe((id) => activated.push(id));
    byTestId('facility-plan-overlay-equipment')?.dispatchEvent(new MouseEvent('click'));

    expect(activated).toEqual(['equipment-1']);
  });

  describe('draw-zone mode', () => {
    beforeEach(async () => {
      fixture.componentRef.setInput('editMode', 'draw-zone');
      await fixture.whenStable();
      stubStageRect();
    });

    it('emits a normalized vertex on a tap', () => {
      const emitted: Array<readonly [number, number]> = [];
      fixture.componentInstance.vertexAdded.subscribe((point) => emitted.push(point));

      const stage = byTestId('facility-plan-editor-stage') as HTMLElement;
      stage.dispatchEvent(pointerEvent('pointerdown', 600, 400));
      document.dispatchEvent(pointerEvent('pointerup', 600, 400));

      expect(emitted).toEqual([[0.5, 0.5]]);
    });

    it('does not add a vertex when the pointer travelled beyond the tap threshold', () => {
      const emitted: Array<readonly [number, number]> = [];
      fixture.componentInstance.vertexAdded.subscribe((point) => emitted.push(point));

      const stage = byTestId('facility-plan-editor-stage') as HTMLElement;
      stage.dispatchEvent(pointerEvent('pointerdown', 0, 0));
      document.dispatchEvent(pointerEvent('pointerup', 400, 400));

      expect(emitted).toEqual([]);
    });

    it('renders the in-progress polyline and its vertices', async () => {
      fixture.componentRef.setInput('draftPoints', [
        [0, 0],
        [0.5, 0],
        [0.5, 0.5],
      ]);
      await fixture.whenStable();

      expect(byTestId('facility-plan-editor-draft')).not.toBeNull();
      expect(allByTestId('facility-plan-editor-draft').length).toBe(1);
    });

    it('requests closing the polygon on a double click with at least three vertices', async () => {
      fixture.componentRef.setInput('draftPoints', [
        [0, 0],
        [0.5, 0],
        [0.5, 0.5],
      ]);
      await fixture.whenStable();

      let closeRequested = 0;
      fixture.componentInstance.polygonCloseRequested.subscribe(() => closeRequested++);
      byTestId('facility-plan-editor-stage')?.dispatchEvent(new MouseEvent('dblclick'));

      expect(closeRequested).toBe(1);
    });

    it('does not request closing below three vertices', async () => {
      fixture.componentRef.setInput('draftPoints', [[0, 0]]);
      await fixture.whenStable();

      let closeRequested = 0;
      fixture.componentInstance.polygonCloseRequested.subscribe(() => closeRequested++);
      byTestId('facility-plan-editor-stage')?.dispatchEvent(new MouseEvent('dblclick'));

      expect(closeRequested).toBe(0);
    });
  });

  describe('place-pin mode', () => {
    it('emits a normalized point on a tap', async () => {
      fixture.componentRef.setInput('editMode', 'place-pin');
      await fixture.whenStable();
      stubStageRect();

      const emitted: Array<readonly [number, number]> = [];
      fixture.componentInstance.pinPlaced.subscribe((point) => emitted.push(point));

      const stage = byTestId('facility-plan-editor-stage') as HTMLElement;
      stage.dispatchEvent(pointerEvent('pointerdown', 300, 200));
      document.dispatchEvent(pointerEvent('pointerup', 300, 200));

      expect(emitted).toEqual([[0.25, 0.25]]);
    });
  });

  describe('none mode', () => {
    it('marks the stage inert to pointer events', async () => {
      fixture.componentRef.setInput('editMode', 'none');
      await fixture.whenStable();

      expect(
        byTestId('facility-plan-editor-stage')?.classList.contains('pointer-events-none'),
      ).toBe(true);
    });
  });

  describe('drag-to-move a pin', () => {
    it('renders no drag handles when canEditEquipment is false', async () => {
      await fixture.whenStable();

      expect(allByTestId('facility-plan-editor-pin-handle').length).toBe(0);
    });

    it('renders a drag handle per equipment pin when canEditEquipment is true and editMode is none', async () => {
      fixture.componentRef.setInput('canEditEquipment', true);
      await fixture.whenStable();

      expect(allByTestId('facility-plan-editor-pin-handle').length).toBe(1);
    });

    it('keeps the handle out of the accessibility tree — a pure pointer affordance', async () => {
      fixture.componentRef.setInput('canEditEquipment', true);
      await fixture.whenStable();

      const handle = byTestId('facility-plan-editor-pin-handle') as HTMLButtonElement;
      expect(handle.getAttribute('aria-hidden')).toBe('true');
      expect(handle.getAttribute('tabindex')).toBe('-1');
      expect(handle.classList.contains('size-11')).toBe(true);
    });

    it('emits equipmentActivated on a plain tap of the handle, not pinMoved', async () => {
      fixture.componentRef.setInput('canEditEquipment', true);
      await fixture.whenStable();
      stubStageRect();
      const handle = byTestId('facility-plan-editor-pin-handle') as HTMLButtonElement;

      const moved: Array<{ equipmentId: string; point: readonly [number, number] }> = [];
      const activated: string[] = [];
      fixture.componentInstance.pinMoved.subscribe((event) => moved.push(event));
      fixture.componentInstance.equipmentActivated.subscribe((id) => activated.push(id));

      handle.dispatchEvent(pointerEvent('pointerdown', 600, 200));
      document.dispatchEvent(pointerEvent('pointerup', 600, 200));

      expect(moved).toEqual([]);
      expect(activated).toEqual(['equipment-1']);
    });

    it('emits pinMoved with the normalized drop position', async () => {
      fixture.componentRef.setInput('canEditEquipment', true);
      await fixture.whenStable();
      stubStageRect();
      const handle = byTestId('facility-plan-editor-pin-handle') as HTMLButtonElement;

      const moved: Array<{ equipmentId: string; point: readonly [number, number] }> = [];
      fixture.componentInstance.pinMoved.subscribe((event) => moved.push(event));

      handle.dispatchEvent(pointerEvent('pointerdown', 600, 200));
      document.dispatchEvent(pointerEvent('pointermove', 900, 400));
      document.dispatchEvent(pointerEvent('pointerup', 900, 400));

      expect(moved).toEqual([{ equipmentId: 'equipment-1', point: [0.75, 0.5] }]);
    });

    it('cancels a drag without emitting on pointercancel', async () => {
      fixture.componentRef.setInput('canEditEquipment', true);
      await fixture.whenStable();
      stubStageRect();
      const handle = byTestId('facility-plan-editor-pin-handle') as HTMLButtonElement;

      const moved: Array<{ equipmentId: string; point: readonly [number, number] }> = [];
      fixture.componentInstance.pinMoved.subscribe((event) => moved.push(event));

      handle.dispatchEvent(pointerEvent('pointerdown', 600, 200));
      document.dispatchEvent(pointerEvent('pointermove', 900, 400));
      document.dispatchEvent(pointerEvent('pointercancel', 900, 400));

      expect(moved).toEqual([]);
    });
  });
});
