import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { BrnSelect } from '@spartan-ng/brain/select';
import { successCallState, errorCallState, toStoreError } from '@core/request-state';
import { HlmSelect } from '@shared/ui/select';
import { MaintenanceExportReferenceForm } from '../maintenance-export-reference-form.component';

describe('MaintenanceExportReferenceForm', () => {
  let fixture: ComponentFixture<MaintenanceExportReferenceForm>;
  let submissions: unknown[];
  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const fill = async (id: string, value: string): Promise<void> => {
    const input = root().querySelector<HTMLInputElement>('#' + id);
    if (!input) throw new Error('Required native input missing.');
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
  };
  const chooseTarget = async (): Promise<void> => {
    const target = fixture.debugElement.queryAll(By.directive(HlmSelect))[1];
    if (!target) throw new Error('Required native selector missing.');
    target.injector.get<BrnSelect<string>>(BrnSelect).select('site-1');
    await fixture.whenStable();
  };
  const submit = async (): Promise<void> => {
    root()
      .querySelector('form')
      ?.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
  };
  beforeEach(async () => {
    fixture = TestBed.createComponent(MaintenanceExportReferenceForm);
    submissions = [];
    fixture.componentRef.setInput('allowedTypes', ['site']);
    fixture.componentRef.setInput(
      'targets',
      successCallState({ member: [{ id: 'site-1', label: 'North fire site' }], totalItems: 1 }),
    );
    fixture.componentRef.setInput('mapping', successCallState(null));
    fixture.componentInstance.submitted.subscribe((value) => submissions.push(value));
    await fixture.whenStable();
  });
  it('emits a readable selected resource at the confirmed absence revision zero', async () => {
    await fill('maintenance-reference-system', 'ERP');
    await chooseTarget();
    await fill('maintenance-reference-value', 'ERP-SITE-1');
    await submit();
    expect(submissions).toEqual([
      {
        resourceType: 'site',
        resourceId: 'site-1',
        system: 'ERP',
        reference: 'ERP-SITE-1',
        revision: 0,
      },
    ]);
    expect(root().querySelector('#maintenance-reference-target')?.textContent).toContain(
      'North fire site',
    );
  });
  it('uses the server-reviewed mapping revision and preserves a dirty draft during a newer read', async () => {
    await fill('maintenance-reference-system', 'ERP');
    await chooseTarget();
    await fill('maintenance-reference-value', 'MY-EDIT');
    fixture.componentRef.setInput(
      'mapping',
      successCallState({
        id: 'mapping',
        resourceType: 'site',
        resourceId: 'site-1',
        system: 'ERP',
        reference: 'OTHER-EDIT',
        revision: 4,
        updatedAt: '2026-10-07T12:00:00Z',
      }),
    );
    await fixture.whenStable();
    expect(root().querySelector<HTMLInputElement>('#maintenance-reference-value')?.value).toBe(
      'MY-EDIT',
    );
    await submit();
    expect(submissions[0]).toMatchObject({ revision: 4, reference: 'MY-EDIT' });
  });
  it('does not turn a failed current reference read into optimistic revision zero', async () => {
    await fill('maintenance-reference-system', 'ERP');
    await chooseTarget();
    await fill('maintenance-reference-value', 'ERP-SITE-1');
    fixture.componentRef.setInput(
      'mapping',
      errorCallState(
        toStoreError({
          type: 'about:blank',
          status: 403,
          title: 'Denied',
          detail: 'Mapping directory forbidden.',
        }),
      ),
    );
    await fixture.whenStable();
    await submit();
    expect(submissions).toEqual([]);
  });
  it('offers no raw identifier field when the owner directories are not readable', async () => {
    fixture.componentRef.setInput('allowedTypes', []);
    await fixture.whenStable();
    expect(root().querySelector('#maintenance-reference-target')).toBeNull();
    expect(root().textContent).toContain('directory permission is required');
    await submit();
    expect(submissions).toEqual([]);
  });
  it('selects an archived customer and retains its UUID, label and mapping across directory scope changes', async () => {
    const queries: unknown[] = [];
    fixture.componentInstance.targetQueryChanged.subscribe((query) => queries.push(query));
    fixture.componentRef.setInput('allowedTypes', ['customer']);
    fixture.componentRef.setInput('targets', successCallState({ member: [], totalItems: 0 }));
    await fixture.whenStable();
    const archive = root().querySelector<HTMLButtonElement>('button[value="archived"]');
    archive?.click();
    await fixture.whenStable();
    expect(queries.at(-1)).toEqual({
      resourceType: 'customer',
      page: 1,
      search: '',
      archived: true,
    });
    fixture.componentRef.setInput(
      'targets',
      successCallState({
        member: [{ id: 'archived-customer', label: 'Archived fire operator' }],
        totalItems: 1,
      }),
    );
    await fixture.whenStable();
    const target = fixture.debugElement.queryAll(By.directive(HlmSelect))[1];
    target?.injector.get<BrnSelect<string>>(BrnSelect).select('archived-customer');
    await fixture.whenStable();
    await fill('maintenance-reference-system', 'ERP');
    fixture.componentRef.setInput(
      'mapping',
      successCallState({
        id: 'mapping',
        resourceType: 'customer',
        resourceId: 'archived-customer',
        system: 'ERP',
        reference: 'ERP-RETAINED',
        revision: 3,
        updatedAt: '2026-10-07T12:00:00Z',
      }),
    );
    await fixture.whenStable();
    await fill('maintenance-reference-value', 'ERP-REVISED');
    root().querySelector<HTMLButtonElement>('button[value="active"]')?.click();
    fixture.componentRef.setInput('targets', successCallState({ member: [], totalItems: 0 }));
    await fixture.whenStable();
    expect(root().querySelector('#maintenance-reference-target')?.textContent).toContain(
      'Archived fire operator',
    );
    await submit();
    expect(submissions).toEqual([
      {
        resourceType: 'customer',
        resourceId: 'archived-customer',
        system: 'ERP',
        reference: 'ERP-REVISED',
        revision: 3,
      },
    ]);
  });
});
