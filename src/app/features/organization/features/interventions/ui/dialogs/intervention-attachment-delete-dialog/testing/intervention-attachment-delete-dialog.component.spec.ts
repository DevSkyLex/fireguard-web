import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { InterventionAttachmentOutput } from '@features/organization/features/interventions/models';
import { InterventionAttachmentDeleteDialog } from '../intervention-attachment-delete-dialog.component';

const attachment: InterventionAttachmentOutput = {
  '@id': '/api/intervention-attachments/attachment-1',
  '@type': 'InterventionAttachment',
  id: 'attachment-1',
  interventionId: 'intervention-1',
  fileName: 'evidence.pdf',
  mimeType: 'application/pdf',
  size: 1024,
  label: null,
  kind: 'file',
  revision: 1,
  uploadedAt: '2026-01-05T09:00:00Z',
};

const content = (): HTMLElement | null =>
  document.querySelector('[data-testid="intervention-attachment-delete-dialog"]');
const confirmButton = (): HTMLButtonElement =>
  content()?.querySelector(
    '[data-testid="intervention-attachment-delete-confirm"]',
  ) as HTMLButtonElement;
const cancelButton = (): HTMLButtonElement =>
  content()?.querySelector('[hlmAlertDialogCancel]') as HTMLButtonElement;

describe('InterventionAttachmentDeleteDialog', () => {
  let fixture: ComponentFixture<InterventionAttachmentDeleteDialog>;
  let confirmed: InterventionAttachmentOutput[];
  let dismissed: number;

  const setRequest = async (request: InterventionAttachmentOutput | null): Promise<void> => {
    fixture.componentRef.setInput('request', request);
    await fixture.whenStable();
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(InterventionAttachmentDeleteDialog);
    await fixture.whenStable();

    confirmed = [];
    dismissed = 0;
    fixture.componentInstance.confirmed.subscribe((event) => confirmed.push(event));
    fixture.componentInstance.dismissed.subscribe(() => dismissed++);
  });

  it('should stay closed while no request is pending', () => {
    expect(content()).toBeNull();
  });

  it('should name the pending attachment', async () => {
    await setRequest(attachment);

    expect(content()?.textContent).toContain('evidence.pdf');
  });

  it('should emit the confirmed attachment', async () => {
    await setRequest(attachment);

    confirmButton().click();

    expect(confirmed).toEqual([attachment]);
  });

  it('should emit dismissed on Cancel without emitting confirmed', async () => {
    await setRequest(attachment);

    cancelButton().click();

    expect(dismissed).toBe(1);
    expect(confirmed).toEqual([]);
  });
});
