import {
  Component,
  input,
  output,
  provideZonelessChangeDetection,
  type InputSignal,
  type OutputEmitterRef,
} from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { MapClickEvent, MapCoordinates } from '@shared/map';
import { Map } from '@shared/map';
import { FacilityMapPickerDialog } from '../facility-map-picker-dialog.component';

/** Stands in for `@shared/map`'s `Map`, so no spec ever mounts MapLibre. */
@Component({ selector: 'app-map', template: '' })
class MapStub {
  public readonly interactive: InputSignal<boolean> = input<boolean>(false);
  public readonly center: InputSignal<MapCoordinates | undefined> = input<
    MapCoordinates | undefined
  >(undefined);
  public readonly mapClicked: OutputEmitterRef<MapClickEvent> = output<MapClickEvent>();
}

const content = (): HTMLElement =>
  document.querySelector('[data-testid="facility-map-picker-dialog"]') as HTMLElement;
const mapStub = (fixture: ComponentFixture<FacilityMapPickerDialog>): MapStub =>
  fixture.debugElement.query((debug) => debug.componentInstance instanceof MapStub)
    .componentInstance as MapStub;

describe('FacilityMapPickerDialog', () => {
  let fixture: ComponentFixture<FacilityMapPickerDialog>;
  let visibleChanges: boolean[];
  let picked: MapCoordinates[];

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    TestBed.overrideComponent(FacilityMapPickerDialog, {
      remove: { imports: [Map] },
      add: { imports: [MapStub] },
    });

    fixture = TestBed.createComponent(FacilityMapPickerDialog);
    await fixture.whenStable();

    visibleChanges = [];
    picked = [];
    fixture.componentInstance.visibleChange.subscribe((value) => visibleChanges.push(value));
    fixture.componentInstance.picked.subscribe((value) => picked.push(value));
  });

  it('stays closed while visible is false', () => {
    expect(content()).toBeNull();
  });

  it('opens with the given center once visible is true', async () => {
    fixture.componentRef.setInput('visible', true);
    fixture.componentRef.setInput('center', { latitude: 48.85, longitude: 2.35 });
    await fixture.whenStable();

    expect(content()).not.toBeNull();
    expect(mapStub(fixture).center()).toEqual({ latitude: 48.85, longitude: 2.35 });
  });

  it('emits the clicked coordinates and closes on a map click', async () => {
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();

    mapStub(fixture).mapClicked.emit({ latitude: 10, longitude: 20 });
    await fixture.whenStable();

    expect(picked).toEqual([{ latitude: 10, longitude: 20 }]);
    expect(visibleChanges).toEqual([false]);
  });

  it('emits visibleChange(false) on dismissal without picking', async () => {
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();

    (
      fixture.componentInstance as unknown as {
        onStateChanged(state: 'open' | 'closed'): void;
      }
    ).onStateChanged('closed');
    await fixture.whenStable();

    expect(visibleChanges).toEqual([false]);
    expect(picked).toEqual([]);
  });
});
