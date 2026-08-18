import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { ApprovalRequestOutput } from '@features/organization/features/approvals/models';
import { ApprovalDecisionDialog } from '../approval-decision-dialog.component';
import type { ApprovalDecisionTarget } from '../models';

const content = (): HTMLElement | null =>
  document.querySelector('[data-testid="approval-decision-dialog"]') as HTMLElement | null;
const inDialog = (selector: string): HTMLElement =>
  (content() as HTMLElement).querySelector(selector) as HTMLElement;
const noteField = (): HTMLTextAreaElement =>
  inDialog('[data-testid="approval-decision-note"]') as HTMLTextAreaElement;
const acceptButton = (): HTMLButtonElement =>
  inDialog('[data-testid="approval-decision-accept"]') as HTMLButtonElement;

describe('ApprovalDecisionDialog', () => {
  let fixture: ComponentFixture<ApprovalDecisionDialog>;

  const request: ApprovalRequestOutput = {
    '@id': '/api/organizations/org-1/approval-requests/request-1',
    '@type': 'ApprovalRequest',
    id: 'request-1',
    organizationId: 'org-1',
    actionType: 'equipment_decommission',
    subjectId: 'equipment-1',
    status: 'pending',
    requestedByMemberId: 'member-1',
    requestedByUserId: 'user-1',
    expiresAt: '2026-02-01T00:00:00+00:00',
    createdAt: '2026-01-18T00:00:00+00:00',
    updatedAt: '2026-01-18T00:00:00+00:00',
  };

  const setTarget = async (target: ApprovalDecisionTarget | null): Promise<void> => {
    fixture.componentRef.setInput('target', target);
    await fixture.whenStable();
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(ApprovalDecisionDialog);
    await fixture.whenStable();
  });

  it('should stay closed while target is null', () => {
    expect(content()).toBeNull();
  });

  it('should state plainly that approving executes the action immediately', async () => {
    await setTarget({ mode: 'approve', request });

    expect(content()?.textContent).toContain('executes the gated action immediately');
  });

  it('should point the note textarea at the character counter via a static aria-describedby', async () => {
    await setTarget({ mode: 'approve', request });

    expect(noteField().getAttribute('aria-describedby')).toBe('approval-decision-note-counter');
    expect(inDialog('#approval-decision-note-counter')).not.toBeNull();
  });

  it('should emit decided with the trimmed note on confirm', async () => {
    await setTarget({ mode: 'reject', request });

    const decidedSpy = vi.fn();
    fixture.componentInstance.decided.subscribe(decidedSpy);

    noteField().value = '  Missing evidence  ';
    noteField().dispatchEvent(new Event('input'));
    await fixture.whenStable();

    acceptButton().click();

    expect(decidedSpy).toHaveBeenCalledWith('Missing evidence');
  });

  it('should reset the note draft and clear the previous error when a new target opens', async () => {
    await setTarget({ mode: 'approve', request });
    fixture.componentRef.setInput('errorText', 'Someone else already decided this request.');
    await fixture.whenStable();

    expect(inDialog('[data-testid="approval-decision-error"]').textContent).toContain(
      'already decided',
    );

    fixture.componentRef.setInput('errorText', null);
    await setTarget({ mode: 'reject', request: { ...request, id: 'request-2' } });

    expect(noteField().value).toBe('');
    expect(content()?.querySelector('[data-testid="approval-decision-error"]')).toBeNull();
  });

  it('should disable the confirm action while pending', async () => {
    await setTarget({ mode: 'approve', request });
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();

    expect(acceptButton().disabled).toBe(true);
  });

  it('should emit dismissed when the dialog closes without deciding', async () => {
    await setTarget({ mode: 'approve', request });

    const dismissedSpy = vi.fn();
    fixture.componentInstance.dismissed.subscribe(dismissedSpy);

    (
      fixture.componentInstance as unknown as { onStateChanged(state: string): void }
    ).onStateChanged('closed');

    expect(dismissedSpy).toHaveBeenCalled();
  });
});
