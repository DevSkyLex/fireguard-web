import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { EquipmentOutput } from '@features/organization/features/equipments/models';
import type {
  InterventionWorkItemExecutionResultInput,
  InterventionWorkItemOutput,
} from '@features/organization/features/interventions/models';
import { REGIONAL_FORMATTING_PORT } from '@features/organization/ports';
import { DEFAULT_REGIONAL_FORMAT_SETTINGS } from '@shared/regional-format';
import { InterventionExecutionResultForm } from '../intervention-execution-result-form.component';

const item: InterventionWorkItemOutput = {
  '@id': '/api/intervention-work-items/work',
  '@type': 'InterventionWorkItem',
  id: 'work',
  intervention: '/api/interventions/intervention',
  action: 'repair',
  target: '/api/equipment/00000000-0000-4000-8000-000000000001',
  targetSummary: null,
  resultResource: null,
  assignee: null,
  assigneeProfile: null,
  source: 'planned',
  status: 'in_progress',
  required: true,
  skipReason: null,
  evidenceCount: 0,
  revision: 7,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-10-06T00:00:00Z',
};

describe('InterventionExecutionResultForm', () => {
  let fixture: ComponentFixture<InterventionExecutionResultForm>;
  let submissions: InterventionWorkItemExecutionResultInput[];
  const submit = async (): Promise<void> => {
    (fixture.nativeElement as HTMLElement)
      .querySelector('form')
      ?.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
  };
  const fill = async (outcome = 'successful', performedAt = '2026-10-05T10:30'): Promise<void> => {
    const fields = fixture.componentInstance['resultForm'];
    fields.performedAt().value.set(performedAt);
    fields.outcome().value.set(outcome);
    fields.workPerformed().value.set('  Replaced the pressure gauge.  ');
    await fixture.whenStable();
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        {
          provide: REGIONAL_FORMATTING_PORT,
          useValue: {
            regionalFormatting: signal({
              ...DEFAULT_REGIONAL_FORMAT_SETTINGS,
              timezone: 'Europe/Paris',
            }),
          },
        },
      ],
    });
    fixture = TestBed.createComponent(InterventionExecutionResultForm);
    fixture.componentRef.setInput('item', item);
    submissions = [];
    fixture.componentInstance.submitted.subscribe((value) => submissions.push(value));
    await fixture.whenStable();
  });

  it('requires an actual date and result without inferring them from task timestamps', async () => {
    expect(fixture.componentInstance['model']().performedAt).toBe('');
    await submit();
    expect(submissions).toEqual([]);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Enter when the work was performed.',
    );
  });

  it('emits the operator date in the organization timezone, independently of device timezone', async () => {
    await fill();
    await submit();
    expect(submissions).toEqual([
      {
        equipmentId: '00000000-0000-4000-8000-000000000001',
        performedAt: '2026-10-05T10:30:00.000+02:00',
        outcome: 'successful',
        workPerformed: 'Replaced the pressure gauge.',
      },
    ]);
  });

  it('rejects a nonexistent local time during the daylight-saving change', async () => {
    await fill('successful', '2026-03-29T02:30');
    await submit();
    expect(submissions).toEqual([]);
    expect(fixture.componentInstance['resultForm'].performedAt().invalid()).toBe(true);
  });

  it('records failed work and reserves the performed outcome for maintenance', async () => {
    await fill('performed');
    await submit();
    expect(submissions).toEqual([]);
    await fill('failed');
    await submit();
    expect(submissions[0].outcome).toBe('failed');
    fixture.componentRef.setInput('item', { ...item, action: 'maintenance' });
    await fixture.whenStable();
    await fill('performed');
    await submit();
    expect(submissions[1].outcome).toBe('performed');
  });

  it.each([
    ['successful', 'Successful'],
    ['performed', 'Performed'],
    ['failed', 'Unsuccessful — work still required'],
  ])('displays the human-readable selected %s result in the trigger', async (outcome, label) => {
    fixture.componentRef.setInput('item', { ...item, action: 'maintenance' });
    await fixture.whenStable();
    await fill(outcome);
    const trigger = (fixture.nativeElement as HTMLElement).querySelector(
      '[data-testid="execution-outcome"]',
    );
    expect(trigger?.textContent?.trim()).toBe(label);
    expect((fixture.nativeElement as HTMLElement).querySelector('hlm-select-content')).toBeNull();
  });

  it('preserves replacement facts while refreshing proof and only completes after a confirmed successor', async () => {
    fixture.componentRef.setInput('item', { ...item, action: 'replacement' });
    fixture.componentRef.setInput('originalEquipmentLink', [
      '/organizations',
      'org-1',
      'equipments',
      'original',
    ]);
    await fixture.whenStable();
    await fill();
    await submit();
    expect(submissions).toEqual([]);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Confirm the replacement in the equipment dossier',
    );
    const facts = { ...fixture.componentInstance['model']() };
    fixture.componentRef.setInput('replacementLoading', true);
    fixture.componentRef.setInput('replacementReadFailed', true);
    await fixture.whenStable();
    await submit();
    expect(submissions).toEqual([]);
    fixture.componentRef.setInput('replacementLoading', false);
    fixture.componentRef.setInput('replacementReadFailed', false);
    fixture.componentRef.setInput('replacementSuccessor', {
      id: 'successor',
      assetCode: 'EXT-NEW',
    } as EquipmentOutput);
    await fixture.whenStable();
    expect(fixture.componentInstance['model']()).toEqual(facts);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('EXT-NEW');
    await submit();
    expect(submissions).toHaveLength(1);
  });

  it('retains a failed replacement as physical fact even when successor proof is unavailable', async () => {
    fixture.componentRef.setInput('item', { ...item, action: 'replacement' });
    fixture.componentRef.setInput('replacementReadFailed', true);
    await fixture.whenStable();
    await fill('failed');
    await submit();
    expect(submissions[0]?.outcome).toBe('failed');
  });

  it('preserves submitted facts on a rejected write and prevents double commitment while pending', async () => {
    await fill();
    fixture.componentRef.setInput('serverError', { message: 'The task revision changed.' });
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();
    await submit();
    expect(submissions).toEqual([]);
    expect(fixture.componentInstance['model']().workPerformed).toBe(
      '  Replaced the pressure gauge.  ',
    );
    fixture.componentRef.setInput('pending', false);
    await fixture.whenStable();
    await submit();
    expect(submissions).toHaveLength(1);
  });

  it('requires new facts for a new attempt and preserves the draft when execution is no longer allowed', async () => {
    fixture.componentRef.setInput('item', {
      ...item,
      executionResult: {
        equipmentId: 'eq-1',
        performedAt: '2026-02-01T10:00:00Z',
        outcome: 'failed',
        workPerformed: 'Previous failed attempt.',
        state: 'staged',
        validatedAt: null,
        operationId: null,
        occurrenceId: null,
      },
    });
    await fixture.whenStable();
    expect(fixture.componentInstance['model']()).toEqual({
      performedAt: '',
      outcome: '',
      workPerformed: '',
    });
    await fill();
    fixture.componentRef.setInput('disabled', true);
    await fixture.whenStable();
    await submit();
    expect(submissions).toEqual([]);
    expect(fixture.componentInstance['model']().workPerformed).toContain(
      'Replaced the pressure gauge.',
    );
    expect(
      (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
        '[data-testid="execution-submit"]',
      )?.disabled,
    ).toBe(true);
  });
});
