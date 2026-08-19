import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { EquipmentTagOutput } from '@features/organization/features/equipments/models';
import { EquipmentTags } from '../equipment-tags.component';

const tag = (id: string, name: string): EquipmentTagOutput =>
  ({
    '@id': `/api/organizations/org-1/equipment/tags/${id}`,
    '@type': 'EquipmentTag',
    id,
    name,
    organizationId: 'org-1',
  }) as EquipmentTagOutput;

describe('EquipmentTags', () => {
  let fixture: ComponentFixture<EquipmentTags>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;

  const create = async (
    tags: readonly EquipmentTagOutput[] = [],
    catalog: readonly EquipmentTagOutput[] = [],
    editable = true,
  ): Promise<void> => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    fixture = TestBed.createComponent(EquipmentTags);
    fixture.componentRef.setInput('tags', tags);
    fixture.componentRef.setInput('catalog', catalog);
    fixture.componentRef.setInput('editable', editable);
    await fixture.whenStable();
  };

  it('should show the empty state when there are no tags', async () => {
    await create([]);

    expect(root().querySelector('[data-testid="equipment-tags-empty"]')).not.toBeNull();
  });

  it('should render one chip per attached tag', async () => {
    await create([tag('1', 'critical'), tag('2', 'exterior')]);

    expect(root().querySelectorAll('[data-testid="equipment-tag-chip"]').length).toBe(2);
  });

  it('should hide the remove buttons and the combobox when not editable', async () => {
    await create([tag('1', 'critical')], [], false);

    expect(root().querySelector('[data-testid="equipment-tag-remove"]')).toBeNull();
    expect(root().querySelector('[data-testid="equipment-tags-add-input"]')).toBeNull();
  });

  it('should emit tagRemoveRequested for the clicked chip', async () => {
    await create([tag('1', 'critical')]);

    const emitted: EquipmentTagOutput[] = [];
    fixture.componentInstance.tagRemoveRequested.subscribe((value) => emitted.push(value));

    root()
      .querySelector<HTMLButtonElement>('[data-testid="equipment-tag-remove"]')
      ?.dispatchEvent(new MouseEvent('click'));

    expect(emitted).toEqual([tag('1', 'critical')]);
  });

  it('should exclude already-attached tags from the catalog offered', async () => {
    await create([tag('1', 'critical')], [tag('1', 'critical'), tag('2', 'exterior')]);

    expect(fixture.componentInstance['availableCatalog']()).toEqual([tag('2', 'exterior')]);
  });

  it('should emit tagAddRequested with the picked catalog tag name', async () => {
    await create([], [tag('2', 'exterior')]);

    const emitted: string[] = [];
    fixture.componentInstance.tagAddRequested.subscribe((value) => emitted.push(value));

    fixture.componentInstance['onPicked']('2');

    expect(emitted).toEqual(['exterior']);
  });

  it('should emit tagAddRequested with the typed text when creating', async () => {
    await create([], []);

    const emitted: string[] = [];
    fixture.componentInstance.tagAddRequested.subscribe((value) => emitted.push(value));

    fixture.componentInstance['searchText'].set('brand new');
    fixture.componentInstance['createFromSearch']();

    expect(emitted).toEqual(['brand new']);
  });
});
