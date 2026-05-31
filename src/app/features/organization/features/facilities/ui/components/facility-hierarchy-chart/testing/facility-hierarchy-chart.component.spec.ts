import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { TreeNode } from 'primeng/api';
import type { FacilityOutput } from '@features/organization/features/facilities/models';
import { FacilityHierarchyChart } from '../facility-hierarchy-chart.component';
import type { FacilityHierarchyNodeData } from '../models';

const facility = (overrides: Partial<FacilityOutput>): FacilityOutput =>
  ({
    id: 'fac-1',
    name: 'Facility 1',
    type: 'site',
    status: 'active',
    code: null,
    hasChildren: false,
    parentFacilityId: null,
    ...overrides,
  }) as unknown as FacilityOutput;

const node = (data: Partial<FacilityHierarchyNodeData>): TreeNode<FacilityHierarchyNodeData> =>
  ({
    data: { facility: null, placeholder: false, loading: false, ...data },
  }) as TreeNode<FacilityHierarchyNodeData>;

describe('FacilityHierarchyChart', () => {
  beforeAll(() => {
    const win = window as Window & { ResizeObserver?: typeof ResizeObserver };
    if (typeof win.ResizeObserver === 'undefined') {
      class ResizeObserverMock {
        public readonly observe = vi.fn();
        public readonly unobserve = vi.fn();
        public readonly disconnect = vi.fn();
      }
      win.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;
    }
  });

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [FacilityHierarchyChart] });
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(FacilityHierarchyChart);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should emit expandRequest and track expansion when a facility node expands', () => {
    const fixture = TestBed.createComponent(FacilityHierarchyChart);
    const component = fixture.componentInstance;
    const emitted = signal<string | null>(null);
    component.expandRequest.subscribe((id) => emitted.set(id));

    component['onNodeExpand']({ node: node({ facility: facility({ id: 'fac-2' }) }) });

    expect(emitted()).toBe('fac-2');
    expect(component['expandedIds']()).toContain('fac-2');
  });

  it('should ignore expansion of placeholder nodes', () => {
    const fixture = TestBed.createComponent(FacilityHierarchyChart);
    const component = fixture.componentInstance;
    const emitted = signal<string | null>(null);
    component.expandRequest.subscribe((id) => emitted.set(id));

    component['onNodeExpand']({ node: node({ facility: null, placeholder: true }) });

    expect(emitted()).toBeNull();
    expect(component['expandedIds']()).toEqual([]);
  });

  it('should drop the id from expansion state on collapse', () => {
    const fixture = TestBed.createComponent(FacilityHierarchyChart);
    const component = fixture.componentInstance;

    component['onNodeExpand']({ node: node({ facility: facility({ id: 'fac-2' }) }) });
    component['onNodeCollapse']({ node: node({ facility: facility({ id: 'fac-2' }) }) });

    expect(component['expandedIds']()).toEqual([]);
  });

  it('should emit navigate with the selected facility', () => {
    const fixture = TestBed.createComponent(FacilityHierarchyChart);
    const component = fixture.componentInstance;
    const target = facility({ id: 'fac-2' });
    const emitted = signal<FacilityOutput | null>(null);
    component.navigate.subscribe((value) => emitted.set(value));

    component['onNavigate'](target);

    expect(emitted()).toBe(target);
  });
});
