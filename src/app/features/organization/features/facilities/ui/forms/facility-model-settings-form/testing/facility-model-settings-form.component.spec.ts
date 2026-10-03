import { provideZonelessChangeDetection, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type {
  FacilityModelInput,
  FacilityModelOutput,
} from '@features/organization/features/facilities/models';
import { FacilityModelSettingsForm } from '../facility-model-settings-form.component';
import type { FacilityModelSettingsDraft } from '../models/draft.interface';

describe('FacilityModelSettingsForm', () => {
  let fixture: ComponentFixture<FacilityModelSettingsForm>;
  let element: HTMLElement;
  const model: FacilityModelOutput = {
    '@id': '',
    '@type': 'FacilityModel',
    id: 'model-1',
    organizationId: 'org-1',
    buildingId: 'building-1',
    fileName: 'building.glb',
    mimeType: 'model/gltf-binary',
    fileSize: 100,
    nodeCount: 2,
    nodes: [
      { index: 0, name: 'Room' },
      { index: 1, name: 'Room' },
    ],
    revision: 1,
    active: true,
    transform: { scale: 1, rotationDegrees: 0, translation: { x: 0, y: 0, z: 0 } },
    bindings: [{ nodeIndex: 0, facilityId: 'room-1' }],
    bindingIssues: [],
    downloadUrl: '',
    createdAt: '',
    updatedAt: '',
  };
  const submit = async (): Promise<void> => {
    element.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
  };
  const fill = async (id: string, value: string): Promise<void> => {
    const input = element.querySelector<HTMLInputElement>(`#${id}`);
    if (!input) throw new Error(`Missing input ${id}`);
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  };
  const draft = (): WritableSignal<FacilityModelSettingsDraft> =>
    (fixture.componentInstance as unknown as { draft: WritableSignal<FacilityModelSettingsDraft> })
      .draft;

  beforeEach(async () => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        public observe(): void {}
        public unobserve(): void {}
        public disconnect(): void {}
      },
    );
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    fixture = TestBed.createComponent(FacilityModelSettingsForm);
    fixture.componentRef.setInput('model', model);
    fixture.componentRef.setInput('selectedNodeIndex', 0);
    fixture.componentRef.setInput('facilityOptions', [
      { value: 'room-1', label: 'Room', typeLabel: 'Zone', pathLabel: null, address: null },
    ]);
    await fixture.whenStable();
    element = fixture.nativeElement as HTMLElement;
  });
  afterEach(() => vi.unstubAllGlobals());

  it('preserves existing associations while facility choices are temporarily unavailable', async () => {
    fixture.componentRef.setInput('facilityOptions', []);
    await fixture.whenStable();
    const emitted: FacilityModelInput[] = [];
    fixture.componentInstance.submitted.subscribe((value) => emitted.push(value));
    await submit();
    expect(emitted[0].bindings).toBeUndefined();
    expect(emitted[0].removeBindingNodeIndices).toBeUndefined();
  });

  it('omits association changes when only aligning a model with unavailable associations', async () => {
    fixture.componentRef.setInput('model', {
      ...model,
      id: 'stale-model',
      bindingIssues: [{ nodeIndex: 1, code: 'target_unavailable' }],
    });
    await fixture.whenStable();
    await fill('model-x', '4');
    const emitted: FacilityModelInput[] = [];
    fixture.componentInstance.submitted.subscribe((value) => emitted.push(value));
    await submit();
    expect(emitted[0]).toEqual({
      transform: { ...model.transform, translation: { x: 4, y: 0, z: 0 } },
    });
  });

  it('explicitly removes a masked association without clearing other unavailable associations', async () => {
    fixture.componentRef.setInput('model', {
      ...model,
      id: 'stale-model',
      bindings: [],
      bindingIssues: [
        { nodeIndex: 0, code: 'target_unavailable' },
        { nodeIndex: 1, code: 'target_unavailable' },
      ],
    });
    await fixture.whenStable();
    expect(element.textContent).toContain('associated facility is unavailable');
    (fixture.componentInstance as unknown as { clearBinding(): void }).clearBinding();
    await fixture.whenStable();
    const emitted: FacilityModelInput[] = [];
    fixture.componentInstance.submitted.subscribe((value) => emitted.push(value));
    await submit();
    expect(emitted[0].bindings).toBeUndefined();
    expect(emitted[0].removeBindingNodeIndices).toEqual([0]);
  });

  it('clears the final usable binding using an explicit index rather than clearing all hidden bindings', async () => {
    (fixture.componentInstance as unknown as { clearBinding(): void }).clearBinding();
    await fixture.whenStable();
    const emitted: FacilityModelInput[] = [];
    fixture.componentInstance.submitted.subscribe((value) => emitted.push(value));
    await submit();
    expect(emitted[0].bindings).toBeUndefined();
    expect(emitted[0].removeBindingNodeIndices).toEqual([0]);
  });

  it('rejects zero scale and non-finite numeric input', async () => {
    const emitted: FacilityModelInput[] = [];
    fixture.componentInstance.submitted.subscribe((value) => emitted.push(value));
    await fill('model-scale', '0');
    await submit();
    expect(emitted).toEqual([]);
    expect(element.textContent).toContain('greater than zero');
    draft().update((value) => ({ ...value, scale: '1', x: 'Infinity' }));
    await submit();
    expect(emitted).toEqual([]);
    expect(element.textContent).toContain('finite number');
  });

  it('retains alignment text and associations after a stale revision refresh', async () => {
    await fill('model-scale', '2.5');
    draft().update((value) => ({ ...value, facilityId: 'room-2' }));
    fixture.componentRef.setInput('model', { ...model, revision: 8 });
    fixture.componentRef.setInput('serverError', {
      message: 'The model changed.',
      code: 412,
      error: null,
      retryable: false,
      timestamp: 0,
    });
    await fixture.whenStable();
    const emitted: FacilityModelInput[] = [];
    fixture.componentInstance.submitted.subscribe((value) => emitted.push(value));
    await submit();
    expect(emitted[0].transform.scale).toBe(2.5);
    expect(emitted[0].bindings).toEqual([{ nodeIndex: 0, facilityId: 'room-2' }]);
    expect(element.textContent).toContain('The model changed.');
  });

  it('preserves one binding per index while allowing multiple nodes for one facility', async () => {
    fixture.componentRef.setInput('selectedNodeIndex', 1);
    await fixture.whenStable();
    draft().update((value) => ({ ...value, facilityId: 'room-1' }));
    const emitted: FacilityModelInput[] = [];
    fixture.componentInstance.submitted.subscribe((value) => emitted.push(value));
    await submit();
    expect(emitted[0].bindings).toEqual([
      { nodeIndex: 0, facilityId: 'room-1' },
      { nodeIndex: 1, facilityId: 'room-1' },
    ]);
  });

  it('reseeds only after a confirmed save or when an independent replacement file is selected', async () => {
    await fill('model-scale', '3');
    fixture.componentRef.setInput('model', {
      ...model,
      revision: 2,
      transform: { ...model.transform, scale: 3 },
    });
    fixture.componentRef.setInput('savedToken', 1);
    await fixture.whenStable();
    expect(element.querySelector<HTMLInputElement>('#model-scale')?.value).toBe('3');
    fixture.componentRef.setInput('model', { ...model, id: 'replacement', bindings: [] });
    await fixture.whenStable();
    expect(draft()().bindings).toEqual([]);
    expect(draft()().facilityId).toBe('');
    expect(draft()().scale).toBe('1');
  });
});
