import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { successCallState } from '@core/request-state';
import type {
  CreateMaintenanceExportInput,
  MaintenanceExportSourceOutput,
} from '@features/organization/features/maintenance-exports/models';
import { HlmCheckbox } from '@shared/ui/checkbox';
import { MaintenanceExportCreateForm } from '../maintenance-export-create-form.component';

const source = (id: string, ready = true): MaintenanceExportSourceOutput => ({
  '@id': '/sources/' + id,
  '@type': 'MaintenanceExportSource',
  id,
  number: 1,
  name: 'Annual control ' + id,
  type: 'inspection',
  publishedAt: '2026-10-07T12:00:00Z',
  publicationId: ready ? 'publication' : null,
  site: { id: 'site', name: 'Site A' },
  customer: null,
  snapshotState: ready ? 'complete' : 'missing',
  identityComplete: true,
  ready,
  blockedReason: ready ? null : 'snapshot_missing',
});

describe('MaintenanceExportCreateForm', () => {
  let fixture: ComponentFixture<MaintenanceExportCreateForm>,
    submissions: Omit<CreateMaintenanceExportInput, 'clientOperationId'>[];
  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const fillSystem = async (value: string): Promise<void> => {
    const input = root().querySelector<HTMLInputElement>('#maintenance-export-system');
    if (!input) throw new Error('Required native input missing.');
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
  };
  const select = async (id: string): Promise<void> => {
    fixture.debugElement
      .queryAll(By.directive(HlmCheckbox))
      .find((item) => item.componentInstance.inputId() === 'export-source-' + id)
      ?.componentInstance.checkedChange.emit(true);
    await fixture.whenStable();
  };
  const submit = async (): Promise<void> => {
    root()
      .querySelector('form')
      ?.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
  };
  beforeEach(async () => {
    fixture = TestBed.createComponent(MaintenanceExportCreateForm);
    submissions = [];
    fixture.componentRef.setInput(
      'sources',
      successCallState({
        '@id': '/sources',
        '@type': 'Collection',
        member: [source('ready'), source('blocked', false)],
        totalItems: 2,
      }),
    );
    fixture.componentInstance.submitted.subscribe((value) => submissions.push(value));
    await fixture.whenStable();
  });
  it('blocks a legacy publication without its retained snapshot and emits only ready selected dossiers', async () => {
    await fillSystem('ERP');
    await select('blocked');
    await submit();
    expect(submissions).toEqual([]);
    await select('ready');
    await submit();
    expect(submissions).toEqual([
      { system: 'ERP', includeInternalCosts: false, interventionIds: ['ready'] },
    ]);
    expect(root().textContent).toContain('Historical publication snapshot missing');
  });
  it('retains a selected dossier across server pages and a recoverable server failure', async () => {
    await fillSystem('ERP');
    await select('ready');
    fixture.componentRef.setInput(
      'sources',
      successCallState({
        '@id': '/sources',
        '@type': 'Collection',
        member: [source('page-two')],
        totalItems: 40,
      }),
    );
    fixture.componentRef.setInput('sourcePage', 2);
    await fixture.whenStable();
    await select('page-two');
    await submit();
    expect(submissions[0]?.interventionIds).toEqual(['ready', 'page-two']);
    fixture.componentRef.setInput('error', { message: 'Lost reply', code: 0, retryable: true });
    await fixture.whenStable();
    expect(root().querySelector<HTMLInputElement>('#maintenance-export-system')?.value).toBe('ERP');
  });
  it('requires an explicit valid system code and rejects whitespace or an empty selection', async () => {
    await fillSystem('   ');
    await select('ready');
    await submit();
    expect(submissions).toEqual([]);
    await fillSystem('ERP with spaces');
    await submit();
    expect(submissions).toEqual([]);
    await fillSystem('ERP-1');
    await submit();
    expect(submissions).toHaveLength(1);
  });
  it('omits the financial opt-in when financial permission is absent', async () => {
    expect(root().querySelector('#maintenance-export-costs')).toBeNull();
    fixture.componentRef.setInput('canIncludeCosts', true);
    await fixture.whenStable();
    expect(root().querySelector('#maintenance-export-costs')).not.toBeNull();
    fixture.componentRef.setInput('canIncludeCosts', false);
    await fixture.whenStable();
    await fillSystem('ERP');
    await select('ready');
    await submit();
    expect(submissions[0]?.includeInternalCosts).toBe(false);
  });
  it('locks all form intents while an accepted operation is pending', async () => {
    await fillSystem('ERP');
    await select('ready');
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();
    await submit();
    expect(submissions).toEqual([]);
    expect(root().querySelector<HTMLButtonElement>('button[type=submit]')?.disabled).toBe(true);
  });
});
