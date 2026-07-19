import { TestBed } from '@angular/core/testing';
import type { FacilityTreeNode } from '@features/organization/features/facilities/models';
import { FacilityTreeTable } from '../facility-tree-table.component';

const node = (
  overrides: Partial<FacilityTreeNode> & Pick<FacilityTreeNode, 'id'>,
): FacilityTreeNode => ({
  name: overrides.id,
  type: 'site',
  parentFacilityId: null,
  equipmentCount: 0,
  status: 'active',
  complianceRate: null,
  children: [],
  ...overrides,
});

describe('FacilityTreeTable', () => {
  const createComponent = (nodes: readonly FacilityTreeNode[], hasError = false) => {
    TestBed.configureTestingModule({ imports: [FacilityTreeTable] });

    const fixture = TestBed.createComponent(FacilityTreeTable);
    fixture.componentRef.setInput('nodes', nodes);
    fixture.componentRef.setInput('hasError', hasError);
    fixture.detectChanges();
    return fixture;
  };

  it('should render the hierarchy', () => {
    const fixture = createComponent([node({ id: 'a', name: 'Main site' })]);

    expect(fixture.nativeElement.textContent).toContain('Main site');
  });

  it('should show an empty state when the organization has no facility', () => {
    const fixture = createComponent([]);

    expect(fixture.nativeElement.querySelector('app-empty-state')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('p-treetable')).toBeNull();
  });

  // An empty hierarchy and a failed request must not look alike: one invites
  // creating a facility, the other invites retrying.
  it('should show an error state rather than an empty state on failure', () => {
    const fixture = createComponent([], true);

    expect(fixture.nativeElement.querySelector('app-error-state')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-empty-state')).toBeNull();
  });

  it('should emit the facility whose name is activated', () => {
    const fixture = createComponent([node({ id: 'a', name: 'Main site' })]);
    const emitted: FacilityTreeNode[] = [];
    fixture.componentInstance.view.subscribe((n: FacilityTreeNode) => emitted.push(n));

    fixture.nativeElement.querySelector('[data-testid="facility-tree-name"]')?.click();

    expect(emitted[0]?.id).toBe('a');
  });

  it('should count facilities at every depth', () => {
    const fixture = createComponent([
      node({ id: 'a', children: [node({ id: 'b' }), node({ id: 'c' })] }),
    ]);

    expect(fixture.nativeElement.querySelector('app-empty-state')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('a');
  });
});

describe('FacilityTreeTable compliance formatting', () => {
  const component = (): FacilityTreeTable => {
    TestBed.configureTestingModule({ imports: [FacilityTreeTable] });
    return TestBed.createComponent(FacilityTreeTable).componentInstance;
  };

  // "0%" and "nothing tracked" are different facts. Rendering null as 0% would
  // report a site with no tracked equipment as fully non-compliant.
  it('should distinguish an untracked node from a zero rate', () => {
    const instance = component() as unknown as {
      complianceLabel: (rate: number | null) => string;
    };

    expect(instance.complianceLabel(null)).toBe('—');
    expect(instance.complianceLabel(0)).toBe('0%');
  });

  it('should band the rate by colour without dropping the number', () => {
    const instance = component() as unknown as {
      complianceClass: (rate: number | null) => string;
      complianceLabel: (rate: number | null) => string;
    };

    expect(instance.complianceClass(95)).toContain('green');
    expect(instance.complianceClass(75)).toContain('amber');
    expect(instance.complianceClass(40)).toContain('red');
    expect(instance.complianceLabel(95)).toBe('95%');
  });
});
