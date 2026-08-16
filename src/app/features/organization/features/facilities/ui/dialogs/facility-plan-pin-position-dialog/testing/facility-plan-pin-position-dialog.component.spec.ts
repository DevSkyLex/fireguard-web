import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { FacilityPlanPinPositionDialog } from '../facility-plan-pin-position-dialog.component';

const content = (): HTMLElement =>
  document.querySelector('[data-testid="facility-plan-pin-position-dialog"]') as HTMLElement;
const byTestId = (id: string): HTMLElement | null =>
  content()?.querySelector(`[data-testid="${id}"]`) ?? null;

describe('FacilityPlanPinPositionDialog', () => {
  let fixture: ComponentFixture<FacilityPlanPinPositionDialog>;

  const open = async (x = 0.25, y = 0.75): Promise<void> => {
    fixture.componentRef.setInput('x', x);
    fixture.componentRef.setInput('y', y);
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    fixture = TestBed.createComponent(FacilityPlanPinPositionDialog);
    await fixture.whenStable();
  });

  it('stays closed while not visible', () => {
    expect(content()).toBeNull();
  });

  it('seeds the draft from x/y, converted to percent', async () => {
    await open(0.25, 0.75);

    expect((byTestId('facility-plan-pin-position-x') as HTMLInputElement).value).toBe('25.0');
    expect((byTestId('facility-plan-pin-position-y') as HTMLInputElement).value).toBe('75.0');
  });

  it('reseeds the draft every time the dialog reopens', async () => {
    await open(0.1, 0.2);
    fixture.componentRef.setInput('visible', false);
    await fixture.whenStable();

    await open(0.6, 0.9);

    expect((byTestId('facility-plan-pin-position-x') as HTMLInputElement).value).toBe('60.0');
  });

  it('disables submit for an out-of-range draft', async () => {
    await open();
    (byTestId('facility-plan-pin-position-x') as HTMLInputElement).value = '150';
    (byTestId('facility-plan-pin-position-x') as HTMLInputElement).dispatchEvent(
      new Event('input'),
    );
    await fixture.whenStable();

    expect((byTestId('facility-plan-pin-position-submit') as HTMLButtonElement).disabled).toBe(
      true,
    );
  });

  it('emits submitted with the position converted back to normalized coordinates', async () => {
    await open(0.25, 0.75);

    const submitted: Array<readonly [number, number]> = [];
    fixture.componentInstance.submitted.subscribe((point) => submitted.push(point));

    (byTestId('facility-plan-pin-position-submit') as HTMLButtonElement).click();

    expect(submitted).toEqual([[0.25, 0.75]]);
  });

  it('emits removed from the "Remove from plan" action', async () => {
    await open();

    let removed = 0;
    fixture.componentInstance.removed.subscribe(() => removed++);
    (byTestId('facility-plan-pin-position-remove') as HTMLButtonElement).click();

    expect(removed).toBe(1);
  });

  it('disables every action while pending', async () => {
    await open();
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();

    expect((byTestId('facility-plan-pin-position-submit') as HTMLButtonElement).disabled).toBe(
      true,
    );
    expect((byTestId('facility-plan-pin-position-remove') as HTMLButtonElement).disabled).toBe(
      true,
    );
  });
});
