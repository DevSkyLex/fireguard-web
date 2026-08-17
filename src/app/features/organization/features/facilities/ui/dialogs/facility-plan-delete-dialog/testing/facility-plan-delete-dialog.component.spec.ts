import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { FacilityAttachmentOutput } from '@features/organization/features/facilities/models';
import { FacilityPlanDeleteDialog } from '../facility-plan-delete-dialog.component';

const PLAN: FacilityAttachmentOutput = {
  '@id': '/api/facility-attachments/plan-1',
  '@type': 'FacilityAttachment',
  id: 'plan-1',
  facilityId: 'facility-1',
  fileName: 'Ground floor.png',
  mimeType: 'image/png',
  size: 2048,
  kind: 'floor_plan',
  isPrimaryPlan: true,
  imageWidth: 1200,
  imageHeight: 800,
  revision: 1,
  uploadedAt: '2026-08-01T00:00:00+00:00',
};

describe('FacilityPlanDeleteDialog', () => {
  let fixture: ComponentFixture<FacilityPlanDeleteDialog>;

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(FacilityPlanDeleteDialog);
    fixture.componentRef.setInput('plan', PLAN);
    await fixture.whenStable();
  });

  it('should name the plan being deleted', () => {
    expect(
      document.querySelector('[data-testid="facility-plan-delete-dialog"]')?.textContent,
    ).toContain('Ground floor.png');
  });

  it('should emit confirmed when the confirm action is activated', () => {
    const confirmed: void[] = [];
    fixture.componentInstance.confirmed.subscribe((): void => {
      confirmed.push(undefined);
    });

    document
      .querySelector<HTMLButtonElement>('[data-testid="facility-plan-delete-confirm"]')
      ?.click();

    expect(confirmed.length).toBe(1);
  });

  it('should not emit confirmed while a delete write is already pending', () => {
    fixture.componentRef.setInput('pending', true);

    const confirmed: void[] = [];
    fixture.componentInstance.confirmed.subscribe((): void => {
      confirmed.push(undefined);
    });

    (fixture.componentInstance as unknown as { confirm(): void }).confirm();

    expect(confirmed.length).toBe(0);
  });

  it('should emit dismissed on a non-open state change', () => {
    const dismissed: void[] = [];
    fixture.componentInstance.dismissed.subscribe((): void => {
      dismissed.push(undefined);
    });

    (
      fixture.componentInstance as unknown as {
        onStateChanged(state: 'open' | 'closed'): void;
      }
    ).onStateChanged('closed');

    expect(dismissed.length).toBe(1);
  });
});
