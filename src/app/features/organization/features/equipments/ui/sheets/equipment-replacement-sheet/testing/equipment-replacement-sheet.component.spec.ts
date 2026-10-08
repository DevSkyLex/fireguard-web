import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { INTERACTION_CAPABILITIES_PORT } from '@core/interaction-capabilities';
import { EquipmentReplacementSheet } from '../equipment-replacement-sheet.component';

describe('EquipmentReplacementSheet', () => {
  let fixture: ComponentFixture<EquipmentReplacementSheet>;
  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        {
          provide: INTERACTION_CAPABILITIES_PORT,
          useValue: { interactionMode: signal('mobile'), isMobileInteractionMode: signal(true) },
        },
      ],
    });
    fixture = TestBed.createComponent(EquipmentReplacementSheet);
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();
  });

  it('preserves the new successor draft while a network result is uncertain', async () => {
    fixture.componentInstance['mode'].set('new');
    await fixture.whenStable();
    const original = document.querySelector<HTMLInputElement>(
      '[data-testid="equipment-create-name"]',
    );
    if (!original) throw new Error('New equipment identity editor was not rendered');
    original.value = 'Entrance extinguisher';
    original.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    fixture.componentRef.setInput('uncertain', true);
    await fixture.whenStable();
    expect(document.querySelector('[data-testid="equipment-create-name"]')).toBe(original);
    fixture.componentRef.setInput('uncertain', false);
    await fixture.whenStable();
    expect(original.value).toBe('Entrance extinguisher');
  });

  it('asks before discarding a new successor draft and closes only after confirmation', () => {
    const closed = vi.fn();
    fixture.componentInstance.visibleChange.subscribe(closed);
    fixture.componentInstance['newDraftDirty'].set(true);
    fixture.componentInstance['close']();
    expect(fixture.componentInstance['unsavedState']()).toBe('open');
    expect(closed).not.toHaveBeenCalled();
    fixture.componentInstance['discard']();
    expect(closed).toHaveBeenCalledWith(false);
  });

  it('emits only successor identity fields and leaves placement to the atomic server operation', () => {
    const submitted = vi.fn();
    fixture.componentInstance.newSubmitted.subscribe(submitted);
    fixture.componentInstance['submitNew']({
      type: 'fire_blanket',
      name: 'New blanket',
      assetCode: 'BL-3',
      facility: '/api/facilities/foreign',
      organization: '/api/organizations/foreign',
      clientId: 'create-uuid',
      intervention: '/api/interventions/foreign',
    });
    expect(submitted).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'fire_blanket', name: 'New blanket', assetCode: 'BL-3' }),
    );
    const value = submitted.mock.calls[0][0] as Readonly<Record<string, unknown>>;
    for (const key of ['facility', 'organization', 'clientId', 'intervention'])
      expect(value).not.toHaveProperty(key);
  });
});
