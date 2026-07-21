import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { MapAddFacilityForm } from '../map-add-facility-form.component';
import type { MapAddFacilityFormValues } from '../models';

describe('MapAddFacilityForm', () => {
  let fixture: ComponentFixture<MapAddFacilityForm>;

  const at = (testId: string): HTMLElement | null =>
    (fixture.nativeElement as HTMLElement).querySelector(`[data-testid="${testId}"]`);

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [MapAddFacilityForm] });
    fixture = TestBed.createComponent(MapAddFacilityForm);
    fixture.detectChanges();
  });

  const setValue = (testId: string, value: string): void => {
    const input = at(testId) as HTMLInputElement | null;
    if (!input) return;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };

  it('does not emit when the site name is blank', () => {
    const emitted = vi.fn();
    fixture.componentInstance.submitted.subscribe(emitted);

    (at('map-add-facility-form') as HTMLFormElement)?.dispatchEvent(
      new Event('submit', { cancelable: true }),
    );

    expect(emitted).not.toHaveBeenCalled();
  });

  it('emits the trimmed name and city on a valid submit', () => {
    const emitted: MapAddFacilityFormValues[] = [];
    fixture.componentInstance.submitted.subscribe((value) => emitted.push(value));

    setValue('map-add-facility-name', '  Northgate Depot  ');
    setValue('map-add-facility-city', '  Lyon  ');
    (at('map-add-facility-form') as HTMLFormElement)?.dispatchEvent(
      new Event('submit', { cancelable: true }),
    );

    expect(emitted).toEqual([{ name: 'Northgate Depot', city: 'Lyon' }]);
  });

  it('emits an empty city rather than blocking submit — city is optional', () => {
    const emitted: MapAddFacilityFormValues[] = [];
    fixture.componentInstance.submitted.subscribe((value) => emitted.push(value));

    setValue('map-add-facility-name', 'Northgate Depot');
    (at('map-add-facility-form') as HTMLFormElement)?.dispatchEvent(
      new Event('submit', { cancelable: true }),
    );

    expect(emitted).toEqual([{ name: 'Northgate Depot', city: '' }]);
  });

  it('emits cancelled when Cancel is activated', () => {
    const emitted = vi.fn();
    fixture.componentInstance.cancelled.subscribe(emitted);

    at('map-add-facility-cancel')?.querySelector('button')?.click();

    expect(emitted).toHaveBeenCalled();
  });

  it('disables the form fields while loading', () => {
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();

    expect((at('map-add-facility-name') as HTMLInputElement)?.disabled).toBe(true);
  });
});
