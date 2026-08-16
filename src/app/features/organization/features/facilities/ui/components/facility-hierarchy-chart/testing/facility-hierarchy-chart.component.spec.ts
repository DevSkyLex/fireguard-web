import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { FacilityOutput } from '@features/organization/features/facilities/models';
import { FacilityHierarchyChart } from '../facility-hierarchy-chart.component';

const facility = (overrides: Partial<FacilityOutput> = {}): FacilityOutput =>
  ({
    '@id': '/api/facilities/facility-1',
    '@type': 'Facility',
    id: 'facility-1',
    organizationId: 'org-1',
    parentFacilityId: null,
    hasChildren: false,
    type: 'site',
    name: 'HQ',
    code: null,
    status: 'active',
    address: null,
    metadata: {},
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }) as FacilityOutput;

describe('FacilityHierarchyChart', () => {
  let fixture: ComponentFixture<FacilityHierarchyChart>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;

  const nodes = (): readonly HTMLElement[] => [
    ...root().querySelectorAll<HTMLElement>('[data-testid="facility-hierarchy-node"]'),
  ];

  const render = async (
    node: FacilityOutput,
    childrenByParent: Readonly<Record<string, ReadonlyArray<FacilityOutput>>>,
    activeFacilityId: string | null = null,
  ): Promise<void> => {
    fixture.componentRef.setInput('facility', node);
    fixture.componentRef.setInput('childrenByParent', childrenByParent);
    fixture.componentRef.setInput('activeFacilityId', activeFacilityId);
    await fixture.whenStable();
  };

  const expandAll = async (): Promise<void> => {
    const toggle: HTMLButtonElement | null = root().querySelector<HTMLButtonElement>(
      '[data-testid="tree-toggle"]:not([aria-label="Collapse"])',
    );
    if (!toggle) return;

    toggle.click();
    await fixture.whenStable();
    await expandAll();
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(FacilityHierarchyChart);
  });

  it('should render the node name and its status tag', async () => {
    await render(facility({ name: 'Headquarters', status: 'archived' }), {});

    expect(root().textContent).toContain('Headquarters');
    expect(root().querySelector('app-facility-status-tag')).not.toBeNull();
  });

  it('should mark the active node selected, and no other node', async () => {
    const parent: FacilityOutput = facility({ id: 'root', name: 'Root', hasChildren: true });
    const child: FacilityOutput = facility({ id: 'child-1', name: 'Child' });
    await render(parent, { root: [child] }, 'child-1');
    await expandAll();

    const rows: readonly HTMLElement[] = [
      ...root().querySelectorAll<HTMLElement>('[data-testid="tree-item"]'),
    ];

    expect(rows[0]?.getAttribute('aria-selected')).toBe('false');
    expect(rows[1]?.getAttribute('aria-selected')).toBe('true');
  });

  it('should render no descendant row when the map holds nothing for the root', async () => {
    await render(facility({ id: 'leaf' }), {});

    expect(nodes()).toHaveLength(1);
  });

  it('should render every level the map resolves', async () => {
    const rootNode: FacilityOutput = facility({ id: 'root', name: 'Root', hasChildren: true });
    const child: FacilityOutput = facility({ id: 'child-1', name: 'Child', hasChildren: true });
    const grandchild: FacilityOutput = facility({ id: 'grandchild-1', name: 'Grandchild' });
    await render(rootNode, { root: [child], 'child-1': [grandchild] });
    await expandAll();

    expect(nodes().map((node: HTMLElement): string => node.textContent?.trim() ?? '')).toEqual([
      expect.stringContaining('Root'),
      expect.stringContaining('Child'),
      expect.stringContaining('Grandchild'),
    ]);
  });

  it('should emit the clicked facility, unwrapped from the tree node', async () => {
    const emitted: FacilityOutput[] = [];
    fixture.componentInstance.selected.subscribe((value: FacilityOutput): void => {
      emitted.push(value);
    });

    const rootNode: FacilityOutput = facility({ id: 'root', name: 'Root', hasChildren: true });
    const child: FacilityOutput = facility({ id: 'child-1', name: 'Child' });
    await render(rootNode, { root: [child] });
    await expandAll();

    nodes()[1]?.click();

    expect(emitted).toEqual([child]);
  });
});
