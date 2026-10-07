import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type {
  MaintenanceReportQuery,
  MaintenanceReportScopeKind,
} from '@features/organization/features/maintenance-costs/models';
import { MaintenanceReportFilterForm } from '../maintenance-report-filter-form.component';

describe('MaintenanceReportFilterForm', () => {
  let fixture: ComponentFixture<MaintenanceReportFilterForm>;
  let submissions: MaintenanceReportQuery[];
  let cleared: MaintenanceReportScopeKind[];
  const initial: MaintenanceReportQuery = {
    from: '2026-01-01',
    to: '2026-01-31',
    groupBy: 'equipment',
    page: 3,
    itemsPerPage: 25,
    siteId: 'previous-site',
  };
  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const setDate = async (id: string, value: string): Promise<void> => {
    const input = root().querySelector<HTMLInputElement>('#' + id);
    if (!input) throw new Error('Missing date input ' + id);
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
  };
  const submit = async (): Promise<void> => {
    root()
      .querySelector('form')
      ?.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
  };
  beforeEach(async () => {
    fixture = TestBed.createComponent(MaintenanceReportFilterForm);
    fixture.componentRef.setInput('query', initial);
    fixture.componentRef.setInput('scope', 'organization/session-1');
    submissions = [];
    cleared = [];
    fixture.componentInstance.submitted.subscribe((value) => submissions.push(value));
    fixture.componentInstance.scopeCleared.subscribe((value) => cleared.push(value));
    await fixture.whenStable();
  });

  it('emits page one with civil dates and named identities, without displaying UUID controls', async () => {
    fixture.componentRef.setInput('selectedScope', {
      site: { id: 'site-uuid-private', name: 'Central fire station' },
      customer: { id: 'customer-uuid-private', name: 'Building operator' },
      equipment: {
        id: 'equipment-uuid-private',
        name: 'Entrance extinguisher',
        assetReference: 'EXT-001',
      },
    });
    await fixture.whenStable();
    await submit();
    expect(submissions).toEqual([
      {
        ...initial,
        page: 1,
        siteId: 'site-uuid-private',
        customerId: 'customer-uuid-private',
        equipmentId: 'equipment-uuid-private',
      },
    ]);
    expect(root().textContent).toContain('Central fire station');
    expect(root().textContent).toContain('Building operator');
    expect(root().textContent).toContain('EXT-001');
    expect(root().textContent).not.toContain('uuid-private');
    expect(root().querySelectorAll('input')).toHaveLength(2);
  });

  it.each([
    ['2024-01-01', '2024-12-31'],
    ['2025-03-29', '2025-03-31'],
    ['2026-01-01', '2026-01-01'],
  ])(
    'accepts the inclusive civil-date boundary %s through %s without DST arithmetic',
    async (from: string, to: string) => {
      await setDate('maintenance-report-from', from);
      await setDate('maintenance-report-to', to);
      await submit();
      expect(submissions).toEqual([{ from, to, groupBy: 'equipment', page: 1, itemsPerPage: 25 }]);
    },
  );

  it.each([
    ['2024-01-01', '2025-01-01'],
    ['2026-02-01', '2026-01-31'],
    ['2025-02-29', '2025-03-01'],
    ['', '2026-01-31'],
  ])(
    'rejects invalid or excessive civil-date window %s through %s',
    async (from: string, to: string) => {
      await setDate('maintenance-report-from', from);
      await setDate('maintenance-report-to', to);
      await submit();
      expect(submissions).toEqual([]);
      expect(root().querySelector('hlm-field-error')).not.toBeNull();
    },
  );

  it('changes grouping through the native non-nullable toggle control', async () => {
    const customer = Array.from(root().querySelectorAll<HTMLButtonElement>('button')).find(
      (button) => button.textContent?.trim() === 'Customer',
    );
    if (!customer) throw new Error('Missing customer grouping button');
    customer.click();
    await fixture.whenStable();
    await submit();
    expect(submissions[0]?.groupBy).toBe('customer');
    customer.click();
    await fixture.whenStable();
    await submit();
    expect(submissions[1]?.groupBy).toBe('customer');
  });

  it('retains date drafts through ordinary query and named-scope changes, but clears them on session replacement', async () => {
    await setDate('maintenance-report-from', '2026-03-10');
    await setDate('maintenance-report-to', '2026-03-31');
    fixture.componentRef.setInput('query', {
      ...initial,
      from: '2026-02-01',
      to: '2026-02-28',
      itemsPerPage: 50,
    });
    fixture.componentRef.setInput('selectedScope', { site: { id: 'new-site', name: 'Warehouse' } });
    await fixture.whenStable();
    await submit();
    expect(submissions[0]).toEqual({
      from: '2026-03-10',
      to: '2026-03-31',
      groupBy: 'equipment',
      page: 1,
      itemsPerPage: 50,
      siteId: 'new-site',
    });
    fixture.componentRef.setInput('scope', 'organization/session-2');
    await fixture.whenStable();
    expect(root().querySelector<HTMLInputElement>('#maintenance-report-from')?.value).toBe(
      '2026-02-01',
    );
    expect(root().querySelector<HTMLInputElement>('#maintenance-report-to')?.value).toBe(
      '2026-02-28',
    );
  });

  it('adopts an explicit reset and emits scope-clear intent without clearing the current draft', async () => {
    fixture.componentRef.setInput('selectedScope', { equipment: { id: 'never-show-this' } });
    await fixture.whenStable();
    expect(root().textContent).toContain('Unnamed equipment');
    expect(root().textContent).not.toContain('never-show-this');
    await setDate('maintenance-report-from', '2026-01-10');
    const clear = Array.from(root().querySelectorAll<HTMLButtonElement>('button')).find(
      (button) => button.textContent?.trim() === 'Clear all named filters',
    );
    if (!clear) throw new Error('Missing named scope clear action');
    clear.click();
    await fixture.whenStable();
    expect(cleared).toEqual(['all']);
    expect(root().querySelector<HTMLInputElement>('#maintenance-report-from')?.value).toBe(
      '2026-01-10',
    );
    fixture.componentRef.setInput('resetToken', 1);
    await fixture.whenStable();
    expect(root().querySelector<HTMLInputElement>('#maintenance-report-from')?.value).toBe(
      initial.from,
    );
  });

  it('disables query intent while pending without losing the editable date text', async () => {
    await setDate('maintenance-report-from', '2026-01-10');
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();
    await submit();
    expect(submissions).toEqual([]);
    expect(root().querySelector<HTMLInputElement>('#maintenance-report-from')?.disabled).toBe(true);
    fixture.componentRef.setInput('pending', false);
    await fixture.whenStable();
    expect(root().querySelector<HTMLInputElement>('#maintenance-report-from')?.value).toBe(
      '2026-01-10',
    );
  });
});
