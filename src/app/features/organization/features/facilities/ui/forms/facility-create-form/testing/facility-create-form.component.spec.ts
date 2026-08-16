import {
  Component,
  input,
  output,
  provideZonelessChangeDetection,
  type InputSignal,
  type OutputEmitterRef,
  type WritableSignal,
} from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { CreateFacilityInput } from '@features/organization/features/facilities/models';
import type { MapClickEvent, MapCoordinates } from '@shared/map';
import { Map } from '@shared/map';
import { FacilityMapPickerDialog } from '../../../dialogs/facility-map-picker-dialog';
import { FacilityCreateForm } from '../facility-create-form.component';
import type { FacilityCreateFormDraft } from '../models';

/** Stands in for `@shared/map`'s `Map`, so no spec ever mounts MapLibre. */
@Component({ selector: 'app-map', template: '' })
class MapStub {
  public readonly interactive: InputSignal<boolean> = input<boolean>(false);
  public readonly center: InputSignal<MapCoordinates | undefined> = input<
    MapCoordinates | undefined
  >(undefined);
  public readonly mapClicked: OutputEmitterRef<MapClickEvent> = output<MapClickEvent>();
}

describe('FacilityCreateForm', () => {
  let fixture: ComponentFixture<FacilityCreateForm>;
  let element: HTMLElement;

  const fill = async (testId: string, value: string): Promise<void> => {
    const control: HTMLInputElement = element.querySelector<HTMLInputElement>(
      `[data-testid="${testId}"]`,
    ) as HTMLInputElement;
    control.value = value;
    control.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  };

  const setModel = async (draft: Partial<FacilityCreateFormDraft>): Promise<void> => {
    const model: WritableSignal<FacilityCreateFormDraft> = (
      fixture.componentInstance as unknown as {
        model: WritableSignal<FacilityCreateFormDraft>;
      }
    ).model;
    model.set({
      type: '',
      name: '',
      parentFacilityId: '',
      code: '',
      address: '',
      latitude: '',
      longitude: '',
      ...draft,
    });
    await fixture.whenStable();
  };

  const submit = async (): Promise<void> => {
    element.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    TestBed.overrideComponent(FacilityMapPickerDialog, {
      remove: { imports: [Map] },
      add: { imports: [MapStub] },
    });

    fixture = TestBed.createComponent(FacilityCreateForm);
    await fixture.whenStable();

    element = fixture.nativeElement as HTMLElement;
  });

  it('should stay quiet until the form is touched', () => {
    expect(element.textContent).not.toContain('Facility type is required.');
    expect(element.textContent).not.toContain('Name is required.');
  });

  it('should refuse to emit while required fields are unset, and show the reasons', async () => {
    const emitted: CreateFacilityInput[] = [];
    fixture.componentInstance.submitted.subscribe((value: CreateFacilityInput): void => {
      emitted.push(value);
    });

    await submit();

    expect(emitted).toEqual([]);
    expect(element.textContent).toContain('Facility type is required.');
    expect(element.textContent).toContain('Name is required.');
  });

  it('should emit the picked type with free-text fields trimmed, dropping blank ones', async () => {
    const emitted: CreateFacilityInput[] = [];
    fixture.componentInstance.submitted.subscribe((value: CreateFacilityInput): void => {
      emitted.push(value);
    });

    await setModel({ type: 'building' });
    await fill('facility-create-name', '  Headquarters  ');
    await fill('facility-create-code', '  HQ-01  ');
    await submit();

    expect(emitted).toEqual([
      {
        type: 'building',
        name: 'Headquarters',
        parentFacilityId: undefined,
        code: 'HQ-01',
        address: undefined,
        latitude: undefined,
        longitude: undefined,
      },
    ]);
  });

  it('should emit a matching coordinate pair as parsed numbers', async () => {
    const emitted: CreateFacilityInput[] = [];
    fixture.componentInstance.submitted.subscribe((value: CreateFacilityInput): void => {
      emitted.push(value);
    });

    await setModel({ type: 'site' });
    await fill('facility-create-name', 'Warehouse');
    await fill('facility-create-latitude', '48.8566');
    await fill('facility-create-longitude', '2.3522');
    await submit();

    expect(emitted).toEqual([expect.objectContaining({ latitude: 48.8566, longitude: 2.3522 })]);
  });

  describe('coordinates — both-or-neither', () => {
    it('should refuse to submit while only one coordinate is filled, and say so', async () => {
      const emitted: CreateFacilityInput[] = [];
      fixture.componentInstance.submitted.subscribe((value: CreateFacilityInput): void => {
        emitted.push(value);
      });

      await setModel({ type: 'site' });
      await fill('facility-create-name', 'Warehouse');
      await fill('facility-create-latitude', '48.8566');
      await submit();

      expect(emitted).toEqual([]);
      expect(element.textContent).toContain(
        'Enter both latitude and longitude, or leave both empty.',
      );
    });

    it('should refuse a latitude out of the -90..90 range', async () => {
      const emitted: CreateFacilityInput[] = [];
      fixture.componentInstance.submitted.subscribe((value: CreateFacilityInput): void => {
        emitted.push(value);
      });

      await setModel({ type: 'site' });
      await fill('facility-create-name', 'Warehouse');
      await fill('facility-create-latitude', '95');
      await fill('facility-create-longitude', '10');
      await submit();

      expect(emitted).toEqual([]);
      expect(element.textContent).toContain('Enter a latitude between -90 and 90.');
    });

    it('should refuse a longitude out of the -180..180 range', async () => {
      const emitted: CreateFacilityInput[] = [];
      fixture.componentInstance.submitted.subscribe((value: CreateFacilityInput): void => {
        emitted.push(value);
      });

      await setModel({ type: 'site' });
      await fill('facility-create-name', 'Warehouse');
      await fill('facility-create-latitude', '10');
      await fill('facility-create-longitude', '181');
      await submit();

      expect(emitted).toEqual([]);
      expect(element.textContent).toContain('Enter a longitude between -180 and 180.');
    });

    it('should accept both coordinates left blank', async () => {
      const emitted: CreateFacilityInput[] = [];
      fixture.componentInstance.submitted.subscribe((value: CreateFacilityInput): void => {
        emitted.push(value);
      });

      await setModel({ type: 'site' });
      await fill('facility-create-name', 'Warehouse');
      await submit();

      expect(emitted).toEqual([
        expect.objectContaining({ latitude: undefined, longitude: undefined }),
      ]);
    });
  });

  it('should surface the API rejection above the form', async () => {
    fixture.componentRef.setInput('serverError', {
      status: 422,
      violations: [{ propertyPath: 'code', message: 'This code is already used.' }],
    });
    await fixture.whenStable();

    expect(element.querySelector('[data-testid="facility-create-error"]')?.textContent).toContain(
      'This code is already used.',
    );
  });

  it('should fall back to a generic message when the rejection carries no violations', async () => {
    fixture.componentRef.setInput('serverError', new Error('boom'));
    await fixture.whenStable();

    expect(element.querySelector('[data-testid="facility-create-error"]')?.textContent).toContain(
      'The facility could not be created.',
    );
  });

  it('should lock the submit control while a request is in flight', async () => {
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();

    const button: HTMLButtonElement | null = element.querySelector(
      '[data-testid="facility-create-submit"]',
    );

    expect(button?.disabled).toBe(true);
    expect(button?.textContent).toContain('Creating…');
  });

  it('should emit cancelled without touching the store', async () => {
    const cancelled: void[] = [];
    fixture.componentInstance.cancelled.subscribe((): void => {
      cancelled.push(undefined);
    });

    element.querySelector<HTMLButtonElement>('[data-testid="facility-create-cancel"]')?.click();

    expect(cancelled.length).toBe(1);
  });

  it('should clear the name control aria-invalid once a name is entered', async () => {
    const nameInput: HTMLInputElement | null = element.querySelector(
      '[data-testid="facility-create-name"]',
    );

    await submit();
    expect(nameInput?.getAttribute('aria-invalid')).toBe('true');

    await setModel({ type: 'building' });
    await fill('facility-create-name', 'Headquarters');

    expect(nameInput?.getAttribute('aria-invalid')).not.toBe('true');
  });

  it('should report dirtiness through dirtyChanged as the field tree is touched', async () => {
    const dirtyChanges: boolean[] = [];
    fixture.componentInstance.dirtyChanged.subscribe((dirty: boolean): void => {
      dirtyChanges.push(dirty);
    });
    await fixture.whenStable();

    await fill('facility-create-name', 'Headquarters');

    expect(dirtyChanges.at(-1)).toBe(true);
  });

  it('should place cancel before the submit control in the DOM', () => {
    const buttons: HTMLButtonElement[] = Array.from(element.querySelectorAll('button[type]'));
    const cancelIndex: number = buttons.findIndex(
      (button: HTMLButtonElement): boolean => button.dataset['testid'] === 'facility-create-cancel',
    );
    const submitIndex: number = buttons.findIndex(
      (button: HTMLButtonElement): boolean => button.dataset['testid'] === 'facility-create-submit',
    );

    expect(cancelIndex).toBeGreaterThanOrEqual(0);
    expect(cancelIndex).toBeLessThan(submitIndex);
  });

  describe('the "Pick on map" picker', () => {
    it('should open the picker dialog when Pick on map is clicked', async () => {
      element
        .querySelector<HTMLButtonElement>('[data-testid="facility-create-pick-on-map"]')
        ?.click();
      await fixture.whenStable();

      expect(document.querySelector('[data-testid="facility-map-picker-dialog"]')).not.toBeNull();
    });

    it('should fill the latitude/longitude inputs from a pick, leaving them editable', async () => {
      (
        fixture.componentInstance as unknown as {
          onMapPicked(coordinates: MapCoordinates): void;
        }
      ).onMapPicked({ latitude: 48.8566, longitude: 2.3522 });
      await fixture.whenStable();

      const latitude: HTMLInputElement | null = element.querySelector(
        '[data-testid="facility-create-latitude"]',
      );
      const longitude: HTMLInputElement | null = element.querySelector(
        '[data-testid="facility-create-longitude"]',
      );

      expect(latitude?.value).toBe('48.8566');
      expect(longitude?.value).toBe('2.3522');
      expect(latitude?.disabled).toBe(false);
      expect(longitude?.disabled).toBe(false);
    });
  });
});
