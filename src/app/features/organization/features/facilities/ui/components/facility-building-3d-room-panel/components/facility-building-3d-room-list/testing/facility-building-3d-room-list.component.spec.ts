import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { FacilityPlanOverlayZone } from '@features/organization/features/facilities/models';
import { FacilityBuilding3dRoomList } from '../facility-building-3d-room-list.component';

const ROOMS: ReadonlyArray<FacilityPlanOverlayZone> = [
  { facilityId: 'room-1', name: 'Server room', type: 'zone', status: 'active', points: [] },
  { facilityId: 'room-2', name: 'Storage', type: 'zone', status: 'archived', points: [] },
  { facilityId: 'room-3', name: 'Break room', type: 'zone', status: 'active', points: [] },
];

describe('FacilityBuilding3dRoomList', () => {
  let fixture: ComponentFixture<FacilityBuilding3dRoomList>;

  function options(): readonly HTMLButtonElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('button[role="option"]'));
  }

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    fixture = TestBed.createComponent(FacilityBuilding3dRoomList);
    fixture.componentRef.setInput('rooms', ROOMS);
    await fixture.whenStable();
  });

  it('renders exactly one option per room — the list offers every room the canvas can pick', () => {
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

  it('marks the selected room aria-selected and starts the roving tabindex there', async () => {
    fixture.componentRef.setInput('selectedRoomId', 'room-2');
    await fixture.whenStable();

    const rendered = options();
    expect(rendered[1].getAttribute('aria-selected')).toBe('true');
    expect(rendered[1].getAttribute('tabindex')).toBe('0');
    expect(rendered[0].getAttribute('tabindex')).toBe('-1');
    expect(rendered[2].getAttribute('tabindex')).toBe('-1');
  });

  it('moves the roving tabindex forward on ArrowDown without emitting a selection', () => {
    const activated = vi.fn();
    fixture.componentInstance.roomActivated.subscribe(activated);
    const container = fixture.nativeElement.querySelector('[role="listbox"]') as HTMLElement;

    container.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', keyCode: 40, bubbles: true }),
    );
    fixture.detectChanges();

    expect(options()[1].getAttribute('tabindex')).toBe('0');
    expect(activated).not.toHaveBeenCalled();
  });

  it('emits roomActivated with the facility id when a row is clicked — the tap-equivalent commit', () => {
    const activated = vi.fn();
    fixture.componentInstance.roomActivated.subscribe(activated);

    options()[2].click();

    expect(activated).toHaveBeenCalledWith('room-3');
  });

  it('renders a fallback message rather than an empty listbox when the floor has no rooms', async () => {
    fixture.componentRef.setInput('rooms', []);
    await fixture.whenStable();

    expect(options()).toHaveLength(0);
    expect(fixture.nativeElement.textContent).toContain('no rooms yet');
  });
});
