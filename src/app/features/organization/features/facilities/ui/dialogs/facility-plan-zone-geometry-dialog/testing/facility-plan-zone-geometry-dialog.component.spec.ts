import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { FacilityPlanZoneGeometryDialog } from '../facility-plan-zone-geometry-dialog.component';

const content = (): HTMLElement =>
  document.querySelector('[data-testid="facility-plan-zone-geometry-dialog"]') as HTMLElement;
const byTestId = (id: string): HTMLElement | null =>
  content()?.querySelector(`[data-testid="${id}"]`) ?? null;
const rows = (): NodeListOf<HTMLElement> =>
  content().querySelectorAll('[data-testid="facility-plan-zone-geometry-row"]');

describe('FacilityPlanZoneGeometryDialog', () => {
  let fixture: ComponentFixture<FacilityPlanZoneGeometryDialog>;

  const open = async (
    points: ReadonlyArray<readonly [number, number]> = [
      [0, 0],
      [0.5, 0],
      [0.5, 0.5],
    ],
  ): Promise<void> => {
    fixture.componentRef.setInput('points', points);
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    fixture = TestBed.createComponent(FacilityPlanZoneGeometryDialog);
    await fixture.whenStable();
  });

  it('stays closed while not visible', () => {
    expect(content()).toBeNull();
  });

  it('seeds one row per point, converted to percent', async () => {
    await open([
      [0.25, 0.5],
      [0.75, 0.1],
      [0.5, 0.9],
    ]);

    expect(rows().length).toBe(3);
    const first = rows()[0];
    expect(
      (first.querySelector('[data-testid="facility-plan-zone-geometry-row-x"]') as HTMLInputElement)
        .value,
    ).toBe('25.0');
    expect(
      (first.querySelector('[data-testid="facility-plan-zone-geometry-row-y"]') as HTMLInputElement)
        .value,
    ).toBe('50.0');
  });

  it('reseeds the draft every time the dialog reopens', async () => {
    await open([[0.1, 0.1]]);
    fixture.componentRef.setInput('visible', false);
    await fixture.whenStable();

    await open([
      [0.2, 0.2],
      [0.3, 0.3],
      [0.4, 0.4],
    ]);

    expect(rows().length).toBe(3);
  });

  it('adds and removes rows', async () => {
    await open([]);
    expect(rows().length).toBe(0);

    (byTestId('facility-plan-zone-geometry-add-row') as HTMLButtonElement).click();
    (byTestId('facility-plan-zone-geometry-add-row') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(rows().length).toBe(2);

    rows()[0]
      .querySelector<HTMLButtonElement>('[data-testid="facility-plan-zone-geometry-row-remove"]')
      ?.click();
    await fixture.whenStable();
    expect(rows().length).toBe(1);
  });

  it('disables submit below three valid rows', async () => {
    await open([[0.1, 0.1]]);

    expect((byTestId('facility-plan-zone-geometry-submit') as HTMLButtonElement).disabled).toBe(
      true,
    );
  });

  it('emits submitted with the outline converted back to normalized coordinates', async () => {
    await open([
      [0, 0],
      [0.5, 0],
      [0.5, 0.5],
    ]);

    const submitted: Array<ReadonlyArray<readonly [number, number]>> = [];
    fixture.componentInstance.submitted.subscribe((points) => submitted.push(points));

    (byTestId('facility-plan-zone-geometry-submit') as HTMLButtonElement).click();

    expect(submitted).toEqual([
      [
        [0, 0],
        [0.5, 0],
        [0.5, 0.5],
      ],
    ]);
  });

  it('emits cleared from the "Clear geometry" action', async () => {
    await open();

    let cleared = 0;
    fixture.componentInstance.cleared.subscribe(() => cleared++);
    (byTestId('facility-plan-zone-geometry-clear') as HTMLButtonElement).click();

    expect(cleared).toBe(1);
  });

  it('disables every action while pending', async () => {
    await open();
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();

    expect((byTestId('facility-plan-zone-geometry-submit') as HTMLButtonElement).disabled).toBe(
      true,
    );
    expect((byTestId('facility-plan-zone-geometry-clear') as HTMLButtonElement).disabled).toBe(
      true,
    );
    expect((byTestId('facility-plan-zone-geometry-add-row') as HTMLButtonElement).disabled).toBe(
      true,
    );
  });
});
