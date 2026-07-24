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

  it('should render the empty state when there is no root facility', () => {
    const fixture = TestBed.createComponent(FacilityHierarchyChart);

    fixture.detectChanges();

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('No hierarchy to display.');
    expect(host.querySelector('p-organization-chart')).toBeNull();
  });

  it('should render the organization chart with the root facility node', () => {
    const fixture = TestBed.createComponent(FacilityHierarchyChart);
    const root = facility({ id: 'fac-root', name: 'Headquarters', code: 'HQ-1', type: 'site' });
    fixture.componentRef.setInput('root', root);

    fixture.detectChanges();

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('Headquarters');
    expect(host.textContent).toContain('HQ-1');
    expect(host.querySelector('p-organization-chart')).toBeTruthy();
  });

  it('should not render a facility code when absent', () => {
    const fixture = TestBed.createComponent(FacilityHierarchyChart);
    const root = facility({ id: 'fac-root', name: 'Headquarters', code: null });
    fixture.componentRef.setInput('root', root);

    fixture.detectChanges();

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('Headquarters');
    expect(host.querySelector('.font-mono')).toBeNull();
  });

  it('should render a skeleton placeholder for an unloaded branch with children', () => {
    const fixture = TestBed.createComponent(FacilityHierarchyChart);
    const root = facility({ id: 'fac-root', name: 'Headquarters', hasChildren: true });
    fixture.componentRef.setInput('root', root);

    fixture.detectChanges();

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('p-skeleton')).toBeTruthy();
  });

  it('should render loaded children nodes for an expanded branch', () => {
    const fixture = TestBed.createComponent(FacilityHierarchyChart);
    const root = facility({ id: 'fac-root', name: 'Headquarters', hasChildren: true });
    const child = facility({ id: 'fac-child', name: 'Floor 1' });
    fixture.componentRef.setInput('root', root);
    fixture.componentRef.setInput('childrenByParent', { 'fac-root': [child] });
    fixture.componentRef.setInput('loadedParentIds', ['fac-root']);

    fixture.detectChanges();

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('Floor 1');
  });

  it('should show the navigate action for non-root nodes but not for the root node', () => {
    const fixture = TestBed.createComponent(FacilityHierarchyChart);
    const root = facility({ id: 'fac-root', name: 'Headquarters', hasChildren: true });
    const child = facility({ id: 'fac-child', name: 'Floor 1' });
    fixture.componentRef.setInput('root', root);
    fixture.componentRef.setInput('childrenByParent', { 'fac-root': [child] });
    fixture.componentRef.setInput('loadedParentIds', ['fac-root']);

    fixture.detectChanges();

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    const viewButtons = Array.from(host.querySelectorAll('button')).filter((el) =>
      el.textContent?.includes('View'),
    );
    expect(viewButtons.length).toBe(1);
  });

  it('should navigate when the view action of a child node is clicked', () => {
    const fixture = TestBed.createComponent(FacilityHierarchyChart);
    const root = facility({ id: 'fac-root', name: 'Headquarters', hasChildren: true });
    const child = facility({ id: 'fac-child', name: 'Floor 1' });
    fixture.componentRef.setInput('root', root);
    fixture.componentRef.setInput('childrenByParent', { 'fac-root': [child] });
    fixture.componentRef.setInput('loadedParentIds', ['fac-root']);
    fixture.detectChanges();
    const navigateSpy = vi.fn();
    fixture.componentInstance.navigate.subscribe(navigateSpy);

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    const viewButton = Array.from(host.querySelectorAll('button')).find((el) =>
      el.textContent?.includes('View'),
    );
    viewButton?.click();

    expect(navigateSpy).toHaveBeenCalledWith(expect.objectContaining({ id: 'fac-child' }));
  });

  it('should resolve the status descriptor for a facility status', () => {
    const fixture = TestBed.createComponent(FacilityHierarchyChart);
    const component = fixture.componentInstance;

    const descriptor = component['statusDescriptor']('active');

    expect(descriptor).toBeTruthy();
    expect(descriptor.label).toBeTruthy();
  });
});
