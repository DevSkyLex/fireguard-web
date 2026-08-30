import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { EquipmentDecommissionDialog } from '../equipment-decommission-dialog.component';

describe('EquipmentDecommissionDialog', () => {
  let fixture: ComponentFixture<EquipmentDecommissionDialog>;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(EquipmentDecommissionDialog);
    fixture.componentRef.setInput('visible', true);
    fixture.componentRef.setInput('equipmentName', 'Extinguisher A-12');
  });

  it('should name the equipment in the confirmation copy', async () => {
    await fixture.whenStable();

    const content: Element | null = document.querySelector(
      '[data-testid="equipment-decommission-dialog"]',
    );

    expect(content?.textContent).toContain('Extinguisher A-12');
  });

  it('should emit confirmed when the decommission action is chosen', async () => {
    const emitted: void[] = [];
    fixture.componentInstance.confirmed.subscribe((): void => {
      emitted.push(undefined);
    });
    await fixture.whenStable();

    document
      .querySelector<HTMLButtonElement>('[data-testid="equipment-decommission-confirm"]')
      ?.click();

    expect(emitted.length).toBe(1);
  });

  it('should not confirm while a lifecycle write is still in flight', async () => {
    fixture.componentRef.setInput('pending', true);
    const emitted: void[] = [];
    fixture.componentInstance.confirmed.subscribe((): void => {
      emitted.push(undefined);
    });
    await fixture.whenStable();

    document
      .querySelector<HTMLButtonElement>('[data-testid="equipment-decommission-confirm"]')
      ?.click();

    expect(emitted).toEqual([]);
  });
});
