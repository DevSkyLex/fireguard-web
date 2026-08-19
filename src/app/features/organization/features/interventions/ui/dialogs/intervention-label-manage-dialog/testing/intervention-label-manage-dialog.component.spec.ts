import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { InterventionLabelOutput } from '@features/organization/features/interventions/models';
import {
  InterventionLabelManageDialog,
  type InterventionLabelCreateSubmittedEvent,
  type InterventionLabelUpdateSubmittedEvent,
} from '../intervention-label-manage-dialog.component';

const labels: readonly InterventionLabelOutput[] = [
  {
    '@id': '/api/intervention-labels/label-1',
    '@type': 'InterventionLabel',
    id: 'label-1',
    organization: '/api/organizations/org-1',
    name: 'Compliance',
    color: '#ff0000',
    createdAt: '',
    updatedAt: '',
  },
];

const content = (): HTMLElement =>
  document.querySelector('[data-testid="intervention-label-manage-dialog"]') as HTMLElement;
const inDialog = (selector: string): HTMLElement =>
  content().querySelector(selector) as HTMLElement;

describe('InterventionLabelManageDialog', () => {
  let fixture: ComponentFixture<InterventionLabelManageDialog>;
  let created: InterventionLabelCreateSubmittedEvent[];
  let updated: InterventionLabelUpdateSubmittedEvent[];
  let removed: string[];
  let closed: number;

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(InterventionLabelManageDialog);
    created = [];
    updated = [];
    removed = [];
    closed = 0;
    fixture.componentInstance.created.subscribe((event) => created.push(event));
    fixture.componentInstance.updated.subscribe((event) => updated.push(event));
    fixture.componentInstance.removed.subscribe((id) => removed.push(id));
    fixture.componentInstance.closed.subscribe(() => closed++);
    fixture.componentRef.setInput('labels', labels);
    await fixture.whenStable();
  });

  it('should stay closed while `open` is false', () => {
    expect(content()).toBeNull();
  });

  it('should list every label once open', async () => {
    fixture.componentRef.setInput('open', true);
    await fixture.whenStable();

    expect(content().textContent).toContain('Compliance');
  });

  it('should emit created for the drafted name and color', async () => {
    fixture.componentRef.setInput('open', true);
    await fixture.whenStable();

    const nameInput = inDialog(
      '[data-testid="intervention-label-create-name"]',
    ) as HTMLInputElement;
    nameInput.value = 'Urgent';
    nameInput.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    (inDialog('[data-testid="intervention-label-create-submit"]') as HTMLButtonElement).click();

    expect(created).toEqual([{ name: 'Urgent', color: '#3b82f6' }]);
  });

  it('should disable the create submit while the name is blank', async () => {
    fixture.componentRef.setInput('open', true);
    await fixture.whenStable();

    const submit = inDialog(
      '[data-testid="intervention-label-create-submit"]',
    ) as HTMLButtonElement;

    expect(submit.disabled).toBe(true);
  });

  it('should emit updated for an edited row', async () => {
    fixture.componentRef.setInput('open', true);
    await fixture.whenStable();

    (inDialog('[data-testid="intervention-label-edit-label-1"]') as HTMLButtonElement).click();
    await fixture.whenStable();

    const nameInput = inDialog(
      '[data-testid="intervention-label-edit-name-label-1"]',
    ) as HTMLInputElement;
    nameInput.value = 'Renamed';
    nameInput.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    (inDialog('[data-testid="intervention-label-edit-save-label-1"]') as HTMLButtonElement).click();

    expect(updated).toEqual([{ labelId: 'label-1', name: 'Renamed', color: '#ff0000' }]);
  });

  it('should emit removed only after the inline confirmation', async () => {
    fixture.componentRef.setInput('open', true);
    await fixture.whenStable();

    (inDialog('[data-testid="intervention-label-remove-label-1"]') as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(removed).toEqual([]);

    (
      inDialog('[data-testid="intervention-label-remove-confirm-label-1"]') as HTMLButtonElement
    ).click();

    expect(removed).toEqual(['label-1']);
  });

  it('should emit closed on dismissal', async () => {
    fixture.componentRef.setInput('open', true);
    await fixture.whenStable();

    fixture.componentInstance['onStateChanged']('closed');

    expect(closed).toBe(1);
  });
});
