import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { FacilityPlanCalibration } from '@features/organization/features/facilities/models';
import { FacilityPlanCalibrationDialog } from '../facility-plan-calibration-dialog.component';

const control = (id: string): HTMLInputElement =>
  document.querySelector(`#calibration-${id}`) as HTMLInputElement;
const button = (id: string): HTMLButtonElement =>
  document.querySelector(`[data-testid="${id}"]`) as HTMLButtonElement;

describe('FacilityPlanCalibrationDialog', () => {
  let fixture: ComponentFixture<FacilityPlanCalibrationDialog>;
  const type = async (id: string, value: string): Promise<void> => {
    control(id).value = value;
    control(id).dispatchEvent(new Event('input'));
    await fixture.whenStable();
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    fixture = TestBed.createComponent(FacilityPlanCalibrationDialog);
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();
  });

  it('calculates uniform scale from a vertical distance on a non-square image', async () => {
    fixture.componentRef.setInput('visible', false);
    await fixture.whenStable();
    fixture.componentRef.setInput('points', [
      [0.25, 0.1],
      [0.25, 0.6],
    ]);
    fixture.componentRef.setInput('imageAspect', 0.5);
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();
    await type('distanceMeters', '5');
    button('facility-calibration-measure').click();
    await fixture.whenStable();
    expect(Number(control('widthMeters').value)).toBeCloseTo(20);
  });

  it('rounds derived draft measurements to six decimals without changing the original points', async () => {
    const points = [
      [0.199999987889492, 0.20000000633045015],
      [0.800000012110507, 0.20000000633045015],
    ] as const;
    fixture.componentRef.setInput('visible', false);
    await fixture.whenStable();
    fixture.componentRef.setInput('points', points);
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();
    expect(control('x1').value).toBe('19.999999');
    expect(control('y1').value).toBe('20.000001');
    expect(control('x2').value).toBe('80.000001');
    expect(control('y2').value).toBe('20.000001');
    await type('distanceMeters', '6');
    button('facility-calibration-measure').click();
    await fixture.whenStable();
    expect(control('widthMeters').value).toBe('10');
    expect(fixture.componentInstance.points()).toBe(points);
    expect(fixture.componentInstance.points()).toEqual([
      [0.199999987889492, 0.20000000633045015],
      [0.800000012110507, 0.20000000633045015],
    ]);
  });

  it('retains six-decimal physical precision when calculating a fractional image width', async () => {
    await type('distanceMeters', '0.3333333333333');
    button('facility-calibration-measure').click();
    await fixture.whenStable();
    expect(control('widthMeters').value).toBe('0.333333');
  });

  it('provides all measurement coordinates through keyboard fields and rejects identical points', async () => {
    await type('x1', '30');
    await type('y1', '40');
    await type('x2', '30');
    await type('y2', '40');
    await type('distanceMeters', '5');
    expect(button('facility-calibration-measure').disabled).toBe(true);
    await type('x2', '80');
    expect(button('facility-calibration-measure').disabled).toBe(false);
  });

  it('preserves the edited transform on failed save and server revision refresh', async () => {
    await type('widthMeters', '32.5');
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();
    fixture.componentRef.setInput('pending', false);
    fixture.componentRef.setInput('errorMessage', 'Revision changed. Retry.');
    fixture.componentRef.setInput('calibration', {
      widthMeters: 10,
      rotationDegrees: 0,
      offsetXMeters: 0,
      offsetZMeters: 0,
    });
    await fixture.whenStable();
    expect(control('widthMeters').value).toBe('32.5');
    expect(document.body.textContent).toContain('Revision changed. Retry.');
  });

  it('submits physical calibration with negative offsets and rotation without editing plan positions', async () => {
    const emitted: Array<FacilityPlanCalibration | null> = [];
    fixture.componentInstance.submitted.subscribe((value) => emitted.push(value));
    await type('widthMeters', '40');
    await type('rotationDegrees', '90');
    await type('offsetXMeters', '-5');
    await type('offsetZMeters', '2');
    button('facility-calibration-save').click();
    expect(emitted).toEqual([
      { widthMeters: 40, rotationDegrees: 90, offsetXMeters: -5, offsetZMeters: 2 },
    ]);
  });

  it('rejects a zero image width without closing the dialog', async () => {
    const submitted = vi.fn();
    fixture.componentInstance.submitted.subscribe(submitted);
    await type('widthMeters', '0');
    button('facility-calibration-save').click();
    await fixture.whenStable();
    expect(submitted).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain('Enter an image width');
  });

  it.each([
    ['rotationDegrees', '360', '361'],
    ['rotationDegrees', '-360', '-361'],
    ['offsetXMeters', '100000', '100001'],
    ['offsetXMeters', '-100000', '-100001'],
    ['offsetZMeters', '100000', '100001'],
    ['offsetZMeters', '-100000', '-100001'],
  ])('keeps the signed %s limit of %s and rejects %s', async (field, limit, invalid) => {
    const submitted = vi.fn();
    fixture.componentInstance.submitted.subscribe(submitted);
    await type('widthMeters', '20');
    await type(field, limit);
    button('facility-calibration-save').click();
    expect(submitted).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ [field]: Number(limit) }),
    );
    submitted.mockClear();
    await type(field, invalid);
    button('facility-calibration-save').click();
    await fixture.whenStable();
    expect(submitted).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain('Enter an orientation from -360 to 360 degrees');
  });
});
