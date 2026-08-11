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

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(FacilityHierarchyChart);
  });

  it('should render the node name and its status tag', async () => {
    await render(facility({ name: 'Headquarters', status: 'archived' }), {});

    expect(root().textContent).toContain('Headquarters');
    expect(root().querySelector('app-facility-status-tag')).not.toBeNull();
  });

  it('should mark the active node with aria-current, and no other node', async () => {
    const parent: FacilityOutput = facility({ id: 'root', name: 'Root' });
    const child: FacilityOutput = facility({ id: 'child-1', name: 'Child' });
    await render(parent, { root: [child] }, 'child-1');

    const nodes: readonly HTMLElement[] = [
      ...root().querySelectorAll<HTMLElement>('[data-testid="facility-hierarchy-node"]'),
    ];

    expect(nodes[0]?.getAttribute('aria-current')).toBeNull();
    expect(nodes[1]?.getAttribute('aria-current')).toBe('true');
  });

  it('should render no child branch when the map holds nothing for this node', async () => {
    await render(facility({ id: 'leaf' }), {});

    expect(root().querySelector('[data-testid="facility-hierarchy-node"] + div')).toBeNull();
  });

  it('should recurse into every level the map resolves', async () => {
    const rootNode: FacilityOutput = facility({ id: 'root', name: 'Root' });
    const child: FacilityOutput = facility({ id: 'child-1', name: 'Child' });
    const grandchild: FacilityOutput = facility({ id: 'grandchild-1', name: 'Grandchild' });
    await render(rootNode, { root: [child], 'child-1': [grandchild] });

    const nodes: readonly HTMLElement[] = [
      ...root().querySelectorAll<HTMLElement>('[data-testid="facility-hierarchy-node"]'),
    ];

    expect(nodes.map((node: HTMLElement): string => node.textContent?.trim() ?? '')).toEqual([
      expect.stringContaining('Root'),
      expect.stringContaining('Child'),
      expect.stringContaining('Grandchild'),
    ]);
  });

  it('should emit its own facility when this level’s node is activated', async () => {
    const emitted: FacilityOutput[] = [];
    fixture.componentInstance.selected.subscribe((value: FacilityOutput): void => {
      emitted.push(value);
    });

    const own: FacilityOutput = facility({ id: 'root', name: 'Root' });
    await render(own, {});

    root().querySelector<HTMLButtonElement>('[data-testid="facility-hierarchy-node"]')?.click();

    expect(emitted).toEqual([own]);
  });

  it('should forward a descendant’s selection unchanged, so only the top page navigates', async () => {
    const emitted: FacilityOutput[] = [];
    fixture.componentInstance.selected.subscribe((value: FacilityOutput): void => {
      emitted.push(value);
    });

    const rootNode: FacilityOutput = facility({ id: 'root', name: 'Root' });
    const child: FacilityOutput = facility({ id: 'child-1', name: 'Child' });
    const grandchild: FacilityOutput = facility({ id: 'grandchild-1', name: 'Grandchild' });
    await render(rootNode, { root: [child], 'child-1': [grandchild] });

    const nodes: readonly HTMLButtonElement[] = [
      ...root().querySelectorAll<HTMLButtonElement>('[data-testid="facility-hierarchy-node"]'),
    ];
    nodes[nodes.length - 1]?.click();

    expect(emitted).toEqual([grandchild]);
  });
});
