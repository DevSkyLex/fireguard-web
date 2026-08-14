import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { EquipmentStatusTagKind } from '@features/organization/features/equipments/models';
import { EquipmentStatusTag } from '../equipment-status-tag.component';

describe('EquipmentStatusTag', () => {
  let fixture: ComponentFixture<EquipmentStatusTag>;

  const render = async (kind: EquipmentStatusTagKind, value: string): Promise<HTMLElement> => {
    fixture.componentRef.setInput('kind', kind);
    fixture.componentRef.setInput('value', value);
    await fixture.whenStable();

    return fixture.nativeElement as HTMLElement;
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(EquipmentStatusTag);
  });

  it.each([
    ['status', 'operational', 'Operational'],
    ['status', 'under_maintenance', 'Under maintenance'],
    ['maintenanceDueStatus', 'overdue', 'Overdue'],
    ['maintenanceDueStatus', 'unscheduled', 'Unscheduled'],
  ] as ReadonlyArray<[EquipmentStatusTagKind, string, string]>)(
    'should render both a glyph and a label for %s/%s, so the value never depends on its colour',
    async (kind: EquipmentStatusTagKind, value: string, label: string) => {
      const element: HTMLElement = await render(kind, value);

      expect(element.textContent).toContain(label);
      expect(element.querySelector('ng-icon svg')).not.toBeNull();
    },
  );

  it('should humanise an unknown value rather than render an empty badge', async () => {
    const element: HTMLElement = await render('status', 'awaiting_parts');

    expect(element.textContent).toContain('awaiting parts');
    expect(element.querySelector('ng-icon')).not.toBeNull();
  });

  it('should leave the badge itself neutral, tinting only the glyph', async () => {
    const element: HTMLElement = await render('status', 'operational');
    const badge: Element | null = element.querySelector('[data-slot="badge"]');
    const icon: Element | null = element.querySelector('ng-icon');

    expect(badge?.getAttribute('data-variant')).toBe('outline');
    expect(badge?.className).not.toMatch(/\bbg-(blue|green|amber|red)-/);
    expect(icon?.className).toContain('text-success');
  });

  it('should render icon and label as a plain row, with no badge, when used as an option', async () => {
    fixture.componentRef.setInput('kind', 'status');
    fixture.componentRef.setInput('value', 'operational');
    fixture.componentRef.setInput('asOption', true);
    await fixture.whenStable();

    const element: HTMLElement = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('[data-slot="badge"]')).toBeNull();
    expect(element.textContent).toContain('Operational');
  });
});
