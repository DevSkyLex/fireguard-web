import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { INTERACTION_CAPABILITIES_PORT } from '@core/interaction-capabilities';
import type { EquipmentOutput } from '@features/organization/features/equipments/models';
import type { FacilityOutput } from '@features/organization/features/facilities/models';
import { FacilityPlanToolbar } from '../facility-plan-toolbar.component';

describe('FacilityPlanToolbar', () => {
  const mobile = signal(false);
  let fixture: ComponentFixture<FacilityPlanToolbar>;

  const byTestId = (id: string): HTMLElement | null =>
    (fixture.nativeElement as HTMLElement).querySelector(`[data-testid="${id}"]`);

  beforeEach(async () => {
    mobile.set(false);
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: INTERACTION_CAPABILITIES_PORT, useValue: { isMobileInteractionMode: mobile } },
      ],
    });
    fixture = TestBed.createComponent(FacilityPlanToolbar);
    await fixture.whenStable();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function useMobileFixture(): Promise<void> {
    mobile.set(true);
    fixture.destroy();
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation((query: string) => ({
        matches: query === '(max-width: 639px)',
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
    fixture = TestBed.createComponent(FacilityPlanToolbar);
    await fixture.whenStable();
  }

  it('names each layer switch by its visible label alone, carrying no separate aria-label', async () => {
    fixture.componentRef.setInput('overlayHasContent', true);
    await fixture.whenStable();

    const zonesSwitch = byTestId('facility-plan-toggle-zones')?.querySelector('[role="switch"]');
    const equipmentSwitch = byTestId('facility-plan-toggle-equipment')?.querySelector(
      '[role="switch"]',
    );
    expect(zonesSwitch?.getAttribute('aria-label')).toBeNull();
    expect(equipmentSwitch?.getAttribute('aria-label')).toBeNull();
    expect(byTestId('facility-plan-toggle-zones')?.closest('label')?.textContent).toContain(
      'Zones',
    );
    expect(byTestId('facility-plan-toggle-equipment')?.closest('label')?.textContent).toContain(
      'Equipment',
    );
  });

  it('hides the 3D link for a non-building facility', () => {
    fixture.componentRef.setInput('is3dLinkVisible', false);
    fixture.detectChanges();

    expect(byTestId('facility-plan-3d-link')).toBeNull();
  });

  it('shows the 3D link for a building facility, pointing at the given route', async () => {
    fixture.componentRef.setInput('is3dLinkVisible', true);
    fixture.componentRef.setInput('plan3dRoute', [
      '/organizations',
      'org-1',
      'facilities',
      'fac-1',
      '3d',
    ]);
    await fixture.whenStable();

    const link = byTestId('facility-plan-3d-link') as HTMLAnchorElement | null;
    expect(link).not.toBeNull();
    expect(link?.getAttribute('href')).toBe('/organizations/org-1/facilities/fac-1/3d');
  });

  it('hides the layer switches when the overlay has no content', () => {
    fixture.componentRef.setInput('overlayHasContent', false);
    fixture.detectChanges();

    expect(byTestId('facility-plan-toggle-zones')).toBeNull();
  });

  it('emits showZonesChanged when the zones switch is toggled', async () => {
    fixture.componentRef.setInput('overlayHasContent', true);
    await fixture.whenStable();

    const changed = vi.fn();
    fixture.componentInstance.showZonesChanged.subscribe(changed);

    byTestId('facility-plan-toggle-zones')?.querySelector<HTMLElement>('[role="switch"]')?.click();

    expect(changed).toHaveBeenCalledWith(false);
  });

  it('shows the editor status row only while a mode is active', async () => {
    expect(byTestId('facility-plan-editor-status')).toBeNull();

    fixture.componentRef.setInput('editMode', 'draw-zone');
    await fixture.whenStable();

    expect(byTestId('facility-plan-editor-status')).not.toBeNull();
  });

  it('emits editingCancelled when Cancel is activated', async () => {
    fixture.componentRef.setInput('editMode', 'place-pin');
    await fixture.whenStable();

    const cancelled = vi.fn();
    fixture.componentInstance.editingCancelled.subscribe(cancelled);

    (byTestId('facility-plan-editor-cancel') as HTMLButtonElement).click();

    expect(cancelled).toHaveBeenCalled();
  });

  it('emits panelOpenRequested when the mobile panel opener is activated', async () => {
    fixture.componentRef.setInput('panelOpenerVisible', true);
    await fixture.whenStable();

    const requested = vi.fn();
    fixture.componentInstance.panelOpenRequested.subscribe(requested);

    (byTestId('facility-plan-open-panel') as HTMLButtonElement).click();

    expect(requested).toHaveBeenCalled();
  });

  it('uses a searchable drawer for a dense zone catalog in mobile interaction mode', async () => {
    await useMobileFixture();
    fixture.componentRef.setInput('canWrite', true);
    fixture.componentRef.setInput('zoneCandidates', [
      { id: 'zone-a', name: 'Assembly hall' } as FacilityOutput,
      { id: 'zone-b', name: 'Boiler room' } as FacilityOutput,
    ]);
    await fixture.whenStable();

    const picked = vi.fn();
    fixture.componentInstance.zoneDrawTargetPicked.subscribe((id) => {
      expect(document.querySelector('hlm-drawer-content')?.getAttribute('data-state')).toBe('open');
      picked(id);
    });
    byTestId('facility-plan-editor-draw-zone-picker')?.click();
    await fixture.whenStable();

    const drawer: HTMLElement | null = document.querySelector(
      '[data-testid="facility-plan-editor-draw-zone-drawer"]',
    );
    expect(drawer).not.toBeNull();

    const input = drawer?.querySelector<HTMLInputElement>('#facility-plan-zone-search');
    if (input) {
      input.value = 'boiler';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    await fixture.whenStable();

    expect(drawer?.textContent).not.toContain('Assembly hall');
    drawer?.querySelector<HTMLButtonElement>('[hlmitem]')?.click();
    await fixture.whenStable();

    expect(picked).toHaveBeenCalledWith('zone-b');
    expect(document.querySelector('hlm-drawer-content')).toBeNull();
  });

  it('uses a searchable drawer for equipment candidates in mobile interaction mode', async () => {
    await useMobileFixture();
    fixture.componentRef.setInput('canEditEquipment', true);
    fixture.componentRef.setInput('equipmentCandidates', [
      {
        id: 'equipment-a',
        type: 'extinguisher',
        serialNumber: 'EXT-42',
        locationLabel: 'Lobby',
      } as EquipmentOutput,
    ]);
    await fixture.whenStable();

    byTestId('facility-plan-editor-place-pin-picker')?.click();
    await fixture.whenStable();

    expect(
      document.querySelector('[data-testid="facility-plan-editor-place-pin-drawer"]'),
    ).not.toBeNull();
    expect(document.body.textContent).toContain('Lobby');
  });
  it('keeps the drawer open without selecting while the editor is busy', async () => {
    await useMobileFixture();
    fixture.componentRef.setInput('canWrite', true);
    fixture.componentRef.setInput('zoneCandidates', [
      { id: 'zone-a', name: 'Assembly hall' } as FacilityOutput,
    ]);
    await fixture.whenStable();
    byTestId('facility-plan-editor-draw-zone-picker')?.click();
    await fixture.whenStable();

    const picked = vi.fn();
    fixture.componentInstance.zoneDrawTargetPicked.subscribe(picked);
    fixture.componentRef.setInput('editMode', 'draw-zone');
    await fixture.whenStable();
    const row = document.querySelector<HTMLButtonElement>('hlm-drawer-content [hlmitem]');
    expect(row?.disabled).toBe(true);
    row?.click();
    expect(fixture.componentInstance['onZoneDrawTargetPicked']('zone-a')).toBe(false);
    expect(picked).not.toHaveBeenCalled();
    expect(document.querySelector('hlm-drawer-content')).not.toBeNull();
  });
  it.each([
    [
      'zone',
      'draw-zone',
      'draw-zone',
      'canWrite',
      'zoneCandidates',
      'zoneDrawTargetPicked',
      'enter-coordinates',
    ],
    [
      'equipment',
      'place-pin',
      'place-pin',
      'canEditEquipment',
      'equipmentCandidates',
      'equipmentPlacePicked',
      'enter-position',
    ],
  ] as const)(
    'restores focus to the keyboard control after selecting %s disables its picker',
    async (kind, picker, mode, permission, candidates, output, control) => {
      await useMobileFixture();
      document.body.appendChild(fixture.nativeElement);
      fixture.componentRef.setInput(permission, true);
      fixture.componentRef.setInput(
        candidates,
        kind === 'zone'
          ? [{ id: 'zone-a', name: 'Assembly hall' } as FacilityOutput]
          : [
              {
                id: 'equipment-a',
                type: 'extinguisher',
                serialNumber: 'EXT-42',
              } as EquipmentOutput,
            ],
      );
      fixture.componentInstance[output].subscribe(() =>
        fixture.componentRef.setInput('editMode', mode),
      );
      await fixture.whenStable();
      const trigger = byTestId('facility-plan-editor-' + picker + '-picker') as HTMLButtonElement;
      trigger.focus();
      trigger.click();
      await fixture.whenStable();

      document.querySelector<HTMLButtonElement>('hlm-drawer-content [hlmitem]')?.click();
      await fixture.whenStable();

      expect(trigger.disabled).toBe(true);
      expect(document.querySelector('hlm-drawer-content')).toBeNull();
      expect(document.activeElement).toBe(byTestId('facility-plan-editor-' + control));
    },
  );
});
