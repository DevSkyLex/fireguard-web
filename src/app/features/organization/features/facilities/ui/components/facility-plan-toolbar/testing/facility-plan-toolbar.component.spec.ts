import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
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
});
