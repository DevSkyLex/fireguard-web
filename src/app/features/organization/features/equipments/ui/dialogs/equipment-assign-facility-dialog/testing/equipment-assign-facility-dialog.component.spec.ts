import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { HlmCombobox } from '@shared/ui/combobox';
import { EquipmentAssignFacilityDialog } from '../equipment-assign-facility-dialog.component';

const options: ReadonlyArray<{ readonly value: string; readonly label: string }> = [
  { value: 'facility-a', label: 'Building A' },
  { value: 'facility-b', label: 'Building B' },
];

const content = (): HTMLElement =>
  document.querySelector('[data-testid="equipment-assign-facility-dialog"]') as HTMLElement;
const inDialog = (selector: string): HTMLElement =>
  content().querySelector(selector) as HTMLElement;

/**
 * Minimal ResizeObserver stand-in: the combobox popover observes its anchor,
 * and the test environment provides no implementation.
 */
class ResizeObserverStub {
  public observe(): void {}
  public unobserve(): void {}
  public disconnect(): void {}
}

describe('EquipmentAssignFacilityDialog', () => {
  let fixture: ComponentFixture<EquipmentAssignFacilityDialog>;
  let assigned: string[];
  let unassigned: number;

  beforeAll(() => {
    globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;
  });

  const pickFacility = async (value: string): Promise<void> => {
    const combobox = fixture.debugElement.query(By.directive(HlmCombobox));
    combobox.triggerEventHandler('valueChange', value);
    await fixture.whenStable();
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(EquipmentAssignFacilityDialog);
    fixture.componentRef.setInput('options', options);
    await fixture.whenStable();

    assigned = [];
    unassigned = 0;
    fixture.componentInstance.assigned.subscribe((value) => assigned.push(value));
    fixture.componentInstance.unassigned.subscribe(() => unassigned++);
  });

  it('should stay closed while not visible', () => {
    expect(content()).toBeNull();
  });

  it('should not offer Unassign when unassigned', async () => {
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();

    expect(inDialog('[data-testid="equipment-facility-unassign"]')).toBeNull();
  });

  it('should offer Unassign and seed the picked facility when already assigned', async () => {
    fixture.componentRef.setInput('currentFacilityId', 'facility-a');
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();

    expect(inDialog('[data-testid="equipment-facility-unassign"]')).not.toBeNull();
  });

  it('should disable Assign until a facility is picked', async () => {
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();

    expect(
      (inDialog('[data-testid="equipment-facility-assign"]') as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it('should emit assigned with the picked facility id', async () => {
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();
    await pickFacility('facility-b');

    (inDialog('[data-testid="equipment-facility-assign"]') as HTMLButtonElement).click();

    expect(assigned).toEqual(['facility-b']);
  });

  it('should emit unassigned when confirmed', async () => {
    fixture.componentRef.setInput('currentFacilityId', 'facility-a');
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();

    (inDialog('[data-testid="equipment-facility-unassign"]') as HTMLButtonElement).click();

    expect(unassigned).toBe(1);
  });

  it('should lock both actions while a write is in flight', async () => {
    fixture.componentRef.setInput('currentFacilityId', 'facility-a');
    fixture.componentRef.setInput('visible', true);
    fixture.componentRef.setInput('assigning', true);
    await fixture.whenStable();

    expect(
      (inDialog('[data-testid="equipment-facility-assign"]') as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(
      (inDialog('[data-testid="equipment-facility-unassign"]') as HTMLButtonElement).disabled,
    ).toBe(true);
  });
});
