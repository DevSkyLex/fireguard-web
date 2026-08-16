import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { FacilityAttachmentOutput } from '@features/organization/features/facilities/models';
import { FacilityPlanList } from '../facility-plan-list.component';

const plan = (overrides: Partial<FacilityAttachmentOutput> = {}): FacilityAttachmentOutput => ({
  '@id': `/api/facility-attachments/${overrides.id ?? 'plan-1'}`,
  '@type': 'FacilityAttachment',
  id: 'plan-1',
  facilityId: 'facility-1',
  fileName: 'ground-floor.png',
  mimeType: 'image/png',
  size: 2048,
  kind: 'floor_plan',
  isPrimaryPlan: false,
  imageWidth: 1200,
  imageHeight: 800,
  revision: 1,
  uploadedAt: '2026-08-01T00:00:00+00:00',
  ...overrides,
});

describe('FacilityPlanList', () => {
  let fixture: ComponentFixture<FacilityPlanList>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const byTestId = (id: string): HTMLElement | null =>
    root().querySelector(`[data-testid="${id}"]`);

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    fixture = TestBed.createComponent(FacilityPlanList);
  });

  it('renders no plan rows and no upload button when the list is empty and read-only', async () => {
    fixture.componentRef.setInput('plans', []);
    fixture.componentRef.setInput('canManage', false);
    await fixture.whenStable();

    expect(root().querySelectorAll('[data-testid="facility-plan-row"]').length).toBe(0);
    expect(byTestId('facility-plans-upload')).toBeNull();
  });

  it('renders a row per plan, with the primary badge on the primary plan', async () => {
    fixture.componentRef.setInput('plans', [
      plan({ id: 'plan-1', isPrimaryPlan: true }),
      plan({ id: 'plan-2', fileName: 'level-2.png', isPrimaryPlan: false }),
    ]);
    fixture.componentRef.setInput('canManage', true);
    await fixture.whenStable();

    const rows = root().querySelectorAll('[data-testid="facility-plan-row"]');
    expect(rows.length).toBe(2);
    expect(byTestId('facility-plan-primary-badge')).not.toBeNull();
  });

  it('emits planSelected when the row button is clicked', async () => {
    fixture.componentRef.setInput('plans', [plan({ id: 'plan-1' })]);
    fixture.componentRef.setInput('canManage', true);
    await fixture.whenStable();

    const selected: string[] = [];
    fixture.componentInstance.planSelected.subscribe((id) => selected.push(id));

    root().querySelector<HTMLButtonElement>('[data-testid="facility-plan-select"]')?.click();

    expect(selected).toEqual(['plan-1']);
  });

  it('marks the selected row button with aria-current', async () => {
    fixture.componentRef.setInput('plans', [
      plan({ id: 'plan-1' }),
      plan({ id: 'plan-2', fileName: 'level-2.png' }),
    ]);
    fixture.componentRef.setInput('canManage', true);
    fixture.componentRef.setInput('selectedPlanId', 'plan-1');
    await fixture.whenStable();

    const buttons = root().querySelectorAll<HTMLButtonElement>(
      '[data-testid="facility-plan-select"]',
    );
    expect(buttons[0].getAttribute('aria-current')).toBe('true');
    expect(buttons[1].getAttribute('aria-current')).toBeNull();
  });

  it('emits filePicked for an accepted image MIME type', async () => {
    fixture.componentRef.setInput('plans', []);
    fixture.componentRef.setInput('canManage', true);
    await fixture.whenStable();

    const picked: File[] = [];
    fixture.componentInstance.filePicked.subscribe((file) => picked.push(file));

    const file = new File(['plan'], 'floor.png', { type: 'image/png' });
    const input = root().querySelector<HTMLInputElement>('input[type="file"]');
    expect(input).not.toBeNull();
    if (input) {
      Object.defineProperty(input, 'files', {
        configurable: true,
        value: { 0: file, length: 1, item: (i: number) => (i === 0 ? file : null) },
      });
      input.dispatchEvent(new Event('change'));
    }
    await fixture.whenStable();

    expect(picked).toEqual([file]);
  });

  it('rejects an unsupported MIME type locally instead of emitting', async () => {
    fixture.componentRef.setInput('plans', []);
    fixture.componentRef.setInput('canManage', true);
    await fixture.whenStable();

    const picked: File[] = [];
    fixture.componentInstance.filePicked.subscribe((file) => picked.push(file));

    const file = new File(['doc'], 'manual.pdf', { type: 'application/pdf' });
    const input = root().querySelector<HTMLInputElement>('input[type="file"]');
    if (input) {
      Object.defineProperty(input, 'files', {
        configurable: true,
        value: { 0: file, length: 1, item: (i: number) => (i === 0 ? file : null) },
      });
      input.dispatchEvent(new Event('change'));
    }
    await fixture.whenStable();

    expect(picked).toEqual([]);
    expect(byTestId('facility-plans-pick-error')).not.toBeNull();
  });

  it('emits deleteRequested only after the confirm dialog is accepted', async () => {
    fixture.componentRef.setInput('plans', [plan({ id: 'plan-1' })]);
    fixture.componentRef.setInput('canManage', true);
    await fixture.whenStable();

    const deleted: FacilityAttachmentOutput[] = [];
    fixture.componentInstance.deleteRequested.subscribe((target) => deleted.push(target));

    (
      fixture.componentInstance as unknown as { pendingDelete: { set: (v: unknown) => void } }
    ).pendingDelete.set(plan({ id: 'plan-1' }));
    await fixture.whenStable();
    expect(document.querySelector('[data-testid="facility-plan-delete-dialog"]')).not.toBeNull();

    document
      .querySelector<HTMLButtonElement>('[data-testid="facility-plan-delete-confirm"]')
      ?.click();

    expect(deleted.map((item) => item.id)).toEqual(['plan-1']);
  });
});
