import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { EquipmentOutput } from '@features/organization/features/equipments/models';
import type { FacilityOutput } from '@features/organization/features/facilities/models';
import { FacilityPlanToolbar } from '../facility-plan-toolbar.component';

describe('FacilityPlanToolbar', () => {
  let fixture: ComponentFixture<FacilityPlanToolbar>;

  const byTestId = (id: string): HTMLElement | null =>
    (fixture.nativeElement as HTMLElement).querySelector(`[data-testid="${id}"]`);

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    });
    fixture = TestBed.createComponent(FacilityPlanToolbar);
    await fixture.whenStable();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function useCompactFixture(): Promise<void> {
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

  it('emits panelOpenRequested when the compact opener is activated', async () => {
    fixture.componentRef.setInput('panelOpenerVisible', true);
    await fixture.whenStable();

    const requested = vi.fn();
    fixture.componentInstance.panelOpenRequested.subscribe(requested);

    (byTestId('facility-plan-open-panel') as HTMLButtonElement).click();

    expect(requested).toHaveBeenCalled();
  });

  it('uses a searchable drawer for a dense zone catalog on compact viewports', async () => {
    await useCompactFixture();
    fixture.componentRef.setInput('canWrite', true);
    fixture.componentRef.setInput('zoneCandidates', [
      { id: 'zone-a', name: 'Assembly hall' } as FacilityOutput,
      { id: 'zone-b', name: 'Boiler room' } as FacilityOutput,
    ]);
    await fixture.whenStable();

    const picked = vi.fn();
    fixture.componentInstance.zoneDrawTargetPicked.subscribe(picked);
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
  });

  it('uses a searchable drawer for equipment candidates on compact viewports', async () => {
    await useCompactFixture();
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
});
