import { provideZonelessChangeDetection, signal, type WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { FieldTree } from '@angular/forms/signals';
import {
  INTERACTION_CAPABILITIES_PORT,
  type InteractionCapabilitiesPort,
} from '@core/interaction-capabilities';
import { pendingCallState, successCallState } from '@core/request-state';
import { EquipmentLabelsDialog } from '../equipment-labels-dialog.component';
import type { EquipmentLabelsDraft } from '../models';

describe('EquipmentLabelsDialog', () => {
  it('locks the printing scope while exporting and preserves it when editing resumes', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        {
          provide: INTERACTION_CAPABILITIES_PORT,
          useValue: {
            isMobileInteractionMode: signal(false),
          } satisfies Pick<InteractionCapabilitiesPort, 'isMobileInteractionMode'>,
        },
      ],
    });
    const fixture = TestBed.createComponent(EquipmentLabelsDialog);
    const component = fixture.componentInstance as unknown as {
      labelForm: FieldTree<EquipmentLabelsDraft>;
      model: WritableSignal<EquipmentLabelsDraft>;
    };
    const draft: EquipmentLabelsDraft = {
      mode: 'facility',
      facilityId: 'site-2',
      ids: ['eq-1'],
    };
    component.model.set(draft);
    await fixture.whenStable();

    expect(component.labelForm.facilityId().disabled()).toBe(false);

    fixture.componentRef.setInput('printCallState', pendingCallState());
    await fixture.whenStable();

    expect(component.labelForm.mode().disabled()).toBe(true);
    expect(component.labelForm.facilityId().disabled()).toBe(true);
    expect(component.labelForm.ids().disabled()).toBe(true);

    fixture.componentRef.setInput('printCallState', successCallState(null));
    await fixture.whenStable();

    expect(component.labelForm.mode().disabled()).toBe(false);
    expect(component.labelForm.facilityId().disabled()).toBe(false);
    expect(component.labelForm.ids().disabled()).toBe(false);
    expect(component.model()).toEqual(draft);
  });

  it('announces changes as a native output without adding a keyboard stop', async () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: INTERACTION_CAPABILITIES_PORT,
          useValue: { interactionMode: signal('desktop'), isMobileInteractionMode: signal(false) },
        },
      ],
    });
    const fixture = TestBed.createComponent(EquipmentLabelsDialog);
    fixture.componentRef.setInput('visible', true);
    fixture.componentRef.setInput('count', 1);
    await fixture.whenStable();

    const counter = document.querySelector<HTMLOutputElement>(
      '[data-testid="equipment-labels-dialog"] output',
    );
    expect(counter).not.toBeNull();
    expect(counter?.textContent?.trim()).toBe('1 labels selected');
    expect(counter?.getAttribute('aria-live')).toBe('polite');
    expect(counter?.hasAttribute('role')).toBe(false);
    expect(counter?.tabIndex).toBe(-1);

    fixture.componentRef.setInput('count', 3);
    await fixture.whenStable();
    expect(counter?.textContent?.trim()).toBe('3 labels selected');
  });
});
