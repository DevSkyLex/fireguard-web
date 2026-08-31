import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { FacilityPlanOverlayZone } from '@features/organization/features/facilities/models';
import { FacilityZoneList } from '../facility-zone-list.component';

const ZONES: ReadonlyArray<FacilityPlanOverlayZone> = [
  { facilityId: 'zone-1', name: 'Server room', type: 'zone', status: 'active', points: [] },
  { facilityId: 'zone-2', name: 'Storage', type: 'zone', status: 'archived', points: [] },
  { facilityId: 'zone-3', name: 'Break room', type: 'zone', status: 'active', points: [] },
];

describe('FacilityZoneList', () => {
  let fixture: ComponentFixture<FacilityZoneList>;

  function options(): readonly HTMLButtonElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('button[role="option"]'));
  }

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    fixture = TestBed.createComponent(FacilityZoneList);
    fixture.componentRef.setInput('zones', ZONES);
    await fixture.whenStable();
  });

  it('renders exactly one option per zone — the list offers every zone the plan/canvas can pick', () => {
    const rendered = options();

    expect(rendered).toHaveLength(3);
    expect(rendered.map((button) => button.textContent?.trim())).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Server room'),
        expect.stringContaining('Storage'),
        expect.stringContaining('Break room'),
      ]),
    );
  });

  it('marks the selected zone aria-selected and starts the roving tabindex there', async () => {
    fixture.componentRef.setInput('selectedZoneId', 'zone-2');
    await fixture.whenStable();

    const rendered = options();
    expect(rendered[1].getAttribute('aria-selected')).toBe('true');
    expect(rendered[1].getAttribute('tabindex')).toBe('0');
    expect(rendered[0].getAttribute('tabindex')).toBe('-1');
    expect(rendered[2].getAttribute('tabindex')).toBe('-1');
  });

  it('moves the roving tabindex forward on ArrowDown without emitting a selection', () => {
    const activated = vi.fn();
    fixture.componentInstance.zoneActivated.subscribe(activated);
    const container = fixture.nativeElement.querySelector('[role="listbox"]') as HTMLElement;

    container.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', keyCode: 40, bubbles: true }),
    );
    fixture.detectChanges();

    expect(options()[1].getAttribute('tabindex')).toBe('0');
    expect(activated).not.toHaveBeenCalled();
  });

  it('emits zoneActivated with the facility id when a row is clicked — the tap-equivalent commit', () => {
    const activated = vi.fn();
    fixture.componentInstance.zoneActivated.subscribe(activated);

    options()[2].click();

    expect(activated).toHaveBeenCalledWith('zone-3');
  });

  it('renders a fallback message rather than an empty listbox when there are no zones', async () => {
    fixture.componentRef.setInput('zones', []);
    await fixture.whenStable();

    expect(options()).toHaveLength(0);
    expect(fixture.nativeElement.textContent).toContain('No zones yet');
  });
});
