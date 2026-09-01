import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type {
  FacilityBuildingModelFloor,
  FacilityPlanOverlayZone,
} from '@features/organization/features/facilities/models';
import { HlmSheet } from '@shared/ui/sheet';
import { FacilityBuilding3dRoomPanel } from '../facility-building-3d-room-panel.component';

const ROOM: FacilityPlanOverlayZone = {
  facilityId: 'room-1',
  name: 'Server room',
  type: 'zone',
  status: 'active',
  points: [],
};

const OTHER_ROOM: FacilityPlanOverlayZone = {
  facilityId: 'room-2',
  name: 'Storage',
  type: 'zone',
  status: 'archived',
  points: [],
};

const FLOOR_1: FacilityBuildingModelFloor = {
  facilityId: 'floor-1',
  name: 'Ground floor',
  levelIndex: 0,
  status: 'active',
  plan: null,
  outline: null,
  rooms: [ROOM, OTHER_ROOM],
};

const FLOOR_2: FacilityBuildingModelFloor = {
  facilityId: 'floor-2',
  name: 'First floor',
  levelIndex: 1,
  status: 'active',
  plan: null,
  outline: null,
  rooms: [],
};

const FLOORS: ReadonlyArray<FacilityBuildingModelFloor> = [FLOOR_1, FLOOR_2];

function stubMatchMedia(matches: boolean): void {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

describe('FacilityBuilding3dRoomPanel', () => {
  let fixture: ComponentFixture<FacilityBuilding3dRoomPanel>;

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function render(
    room: FacilityPlanOverlayZone | null = null,
    compactVisible = true,
  ): Promise<void> {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    fixture = TestBed.createComponent(FacilityBuilding3dRoomPanel);
    fixture.componentRef.setInput('floors', FLOORS);
    fixture.componentRef.setInput('selectedFloorId', 'floor-1');
    fixture.componentRef.setInput('room', room);
    fixture.componentRef.setInput('compactVisible', compactVisible);
    document.body.appendChild(fixture.nativeElement);
    await fixture.whenStable();
  }

  it('mounts with the floor selector and room list alone, before any room is selected', async () => {
    stubMatchMedia(false);
    await render(null);

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('[data-testid="facility-3d-room-panel"]')).not.toBeNull();
    expect(element.querySelector('[data-testid="facility-3d-floor-selector"]')).not.toBeNull();
    expect(element.querySelector('[data-testid="facility-3d-room-list"]')).not.toBeNull();
    expect(element.querySelector('[data-testid="facility-3d-room-panel-close"]')).toBeNull();
  });

  it('marks the active floor with aria-current, and every floor is reachable regardless of selection', async () => {
    stubMatchMedia(false);
    await render(null);

    const buttons = Array.from(
      fixture.nativeElement.querySelectorAll('[data-testid="facility-3d-floor-selector-option"]'),
    ) as HTMLButtonElement[];
    expect(buttons).toHaveLength(2);
    expect(buttons[0].getAttribute('aria-current')).toBe('true');
    expect(buttons[1].getAttribute('aria-current')).toBeNull();
  });

  it('emits floorActivated when a different floor is picked', async () => {
    stubMatchMedia(false);
    await render(null);
    const activated = vi.fn();
    fixture.componentInstance.floorActivated.subscribe(activated);

    const buttons = fixture.nativeElement.querySelectorAll(
      '[data-testid="facility-3d-floor-selector-option"]',
    );
    (buttons[1] as HTMLButtonElement).click();

    expect(activated).toHaveBeenCalledWith('floor-2');
  });

  it('renders the room detail block, with a close control, only once a room is selected', async () => {
    stubMatchMedia(false);
    await render(ROOM);

    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Server room');
    expect(element.querySelector('[data-testid="facility-3d-room-panel-close"]')).not.toBeNull();
  });

  it('switches to the sheet branch below the sm breakpoint', async () => {
    stubMatchMedia(true);
    await render(null);

    expect(document.querySelector('hlm-sheet-content')).not.toBeNull();
    expect(document.querySelector('[data-testid="facility-3d-room-panel"]')).not.toBeNull();
  });

  it('keeps the sheet dismissible and reports the dismissal to the page', async () => {
    // A sheet that cannot be dismissed covers most of a small screen with the
    // very building it describes. The page owns the flag and puts a toolbar
    // control back, so the keyboard path survives the sheet being closed.
    stubMatchMedia(true);
    await render(null);

    const sheet = fixture.debugElement.query(
      (debugElement) => debugElement.injector.get(HlmSheet, null) !== null,
    );
    expect(sheet.injector.get(HlmSheet).disableClose()).toBe(false);

    const dismissed = vi.fn();
    fixture.componentInstance.compactDismissed.subscribe(dismissed);
    sheet.injector.get(HlmSheet).stateChanged.emit('closed');

    expect(dismissed).toHaveBeenCalledTimes(1);
  });

  it('does not render the sheet while the page reports it closed', async () => {
    stubMatchMedia(true);
    await render(null, false);

    expect(document.querySelector('hlm-sheet-content')).toBeNull();
  });

  it('emits roomClosed when the room-detail close button is activated, leaving the floor selection untouched', async () => {
    stubMatchMedia(false);
    await render(ROOM);
    const closed = vi.fn();
    fixture.componentInstance.roomClosed.subscribe(closed);

    const button = fixture.nativeElement.querySelector(
      '[data-testid="facility-3d-room-panel-close"]',
    ) as HTMLButtonElement;
    button.click();

    expect(closed).toHaveBeenCalled();
  });

  it('forwards a pick from the room list as its own roomActivated', async () => {
    stubMatchMedia(false);
    await render(null);
    const activated = vi.fn();
    fixture.componentInstance.roomActivated.subscribe(activated);

    const secondOption = fixture.nativeElement.querySelectorAll(
      'button[role="option"]',
    )[1] as HTMLButtonElement;
    secondOption.click();

    expect(activated).toHaveBeenCalledWith('room-2');
  });

  it('emits plan2dRequested when the 2D plan action is activated', async () => {
    stubMatchMedia(false);
    await render(ROOM);
    const requested = vi.fn();
    fixture.componentInstance.plan2dRequested.subscribe(requested);

    fixture.nativeElement.querySelectorAll('button').forEach((button: HTMLButtonElement): void => {
      if (button.textContent?.includes('View on 2D plan')) button.click();
    });

    expect(requested).toHaveBeenCalled();
  });

  it('moves DOM focus onto the room-detail close button when focus() is called', async () => {
    stubMatchMedia(false);
    await render(ROOM);

    fixture.componentInstance.focus();

    const closeButton = fixture.nativeElement.querySelector(
      '[data-testid="facility-3d-room-panel-close"]',
    );
    expect(document.activeElement).toBe(closeButton);
  });

  it('is a no-op when focus() is called with no room selected', async () => {
    stubMatchMedia(false);
    await render(null);

    expect(() => fixture.componentInstance.focus()).not.toThrow();
  });
});
