import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { FacilityModelOutput } from '@features/organization/features/facilities/models';
import { FacilityModelManager } from '../facility-model-manager.component';

const model: FacilityModelOutput = {
  '@id': '',
  '@type': 'FacilityModel',
  id: 'model-1',
  organizationId: 'org-1',
  buildingId: 'building-1',
  fileName: 'building.glb',
  mimeType: 'model/gltf-binary',
  fileSize: 100,
  nodeCount: 1,
  nodes: [{ index: 0, name: 'Room' }],
  revision: 1,
  active: false,
  transform: { scale: 1, rotationDegrees: 0, translation: { x: 0, y: 0, z: 0 } },
  bindings: [],
  bindingIssues: [{ nodeIndex: 0, code: 'target_unavailable' }],
  downloadUrl: '',
  createdAt: '',
  updatedAt: '',
};

describe('FacilityModelManager spatial diagnostics', () => {
  let fixture: ComponentFixture<FacilityModelManager>;
  let element: HTMLElement;

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    fixture = TestBed.createComponent(FacilityModelManager);
    fixture.componentRef.setInput('models', [model]);
    fixture.componentRef.setInput('selectedModel', model);
    fixture.componentRef.setInput('canWrite', true);
    await fixture.whenStable();
    element = fixture.nativeElement as HTMLElement;
  });

  it('prevents activating an unavailable association while keeping its authenticated download action available', () => {
    const buttons = Array.from(element.querySelectorAll<HTMLButtonElement>('button'));
    expect(buttons.find((button) => button.textContent?.trim() === 'Activate')?.disabled).toBe(
      true,
    );
    const download = buttons.find((button) => button.textContent?.trim() === 'Download');
    expect(download?.disabled).toBe(false);
    const requested = vi.fn();
    fixture.componentInstance.downloaded.subscribe(requested);
    download?.click();
    expect(requested).toHaveBeenCalledExactlyOnceWith(model.id);
  });

  it('selects the immutable problematic node from the accessible diagnostics list', () => {
    const button = element.querySelector<HTMLButtonElement>(
      '[data-testid="facility-model-binding-issues"] button',
    );
    expect(button?.textContent).toContain('associated facility is unavailable');
    const selected = vi.fn();
    fixture.componentInstance.nodeSelected.subscribe(selected);
    button?.click();
    expect(selected).toHaveBeenCalledExactlyOnceWith(0);
    expect(element.textContent).not.toContain('target_unavailable');
  });
});
