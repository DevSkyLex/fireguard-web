import { TestBed } from '@angular/core/testing';
import type { OrganizationJoinRequestOutput } from '@features/organization/models';
import { OrganizationJoinRequestReviewDialog } from '../organization-join-request-review-dialog.component';
const REQUEST: OrganizationJoinRequestOutput = {
  '@id': '/requests/r1',
  '@type': 'JoinRequest',
  id: 'r1',
  organizationId: 'org',
  organizationName: 'Company',
  status: 'pending',
  createdAt: '2026-09-01',
  expiresAt: '2026-10-01',
  actions: ['approve', 'reject'],
  applicantEmail: 'person@company.test',
};
describe('OrganizationJoinRequestReviewDialog', () => {
  beforeAll(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe(): void {}
        unobserve(): void {}
        disconnect(): void {}
      },
    );
  });
  afterAll(() => vi.unstubAllGlobals());
  it('renders role labels for restored selections without opening the role list', async () => {
    const fixture = TestBed.createComponent(OrganizationJoinRequestReviewDialog);
    fixture.componentRef.setInput('request', REQUEST);
    fixture.componentRef.setInput('roles', [
      { id: 'role-1', label: 'Member' },
      { id: 'role-2', label: 'Technician' },
    ]);
    fixture.detectChanges();
    fixture.componentInstance['model'].set({ roleIds: ['role-1', 'role-2'] });
    await fixture.whenStable();
    const text = document.querySelector('#join-request-roles')?.textContent;
    expect(text).toContain('Member');
    expect(text).toContain('Technician');
    expect(text).not.toContain('role-1');
  });

  it('approves only with roles present in the server-authorized catalogue', () => {
    const fixture = TestBed.createComponent(OrganizationJoinRequestReviewDialog);
    fixture.componentRef.setInput('request', REQUEST);
    fixture.componentRef.setInput('roles', [{ id: 'member', label: 'Member' }]);
    fixture.detectChanges();
    const emitted = vi.fn();
    fixture.componentInstance.approved.subscribe(emitted);
    fixture.componentInstance['approve'](new Event('submit'));
    expect(emitted).not.toHaveBeenCalled();
    fixture.componentInstance['model'].set({ roleIds: ['owner'] });
    fixture.componentInstance['approve'](new Event('submit'));
    expect(emitted).not.toHaveBeenCalled();
    fixture.componentInstance['model'].set({ roleIds: ['member'] });
    fixture.componentInstance['approve'](new Event('submit'));
    expect(emitted).toHaveBeenCalledWith({ requestId: 'r1', roleIds: ['member'] });
  });
  it('allows a refusal without selecting roles and prevents double actions while pending', () => {
    const fixture = TestBed.createComponent(OrganizationJoinRequestReviewDialog);
    fixture.componentRef.setInput('request', REQUEST);
    fixture.detectChanges();
    const emitted = vi.fn();
    fixture.componentInstance.rejected.subscribe(emitted);
    fixture.componentInstance['reject']();
    expect(emitted).toHaveBeenCalledWith('r1');
    fixture.componentRef.setInput('pending', true);
    fixture.detectChanges();
    fixture.componentInstance['reject']();
    expect(emitted).toHaveBeenCalledTimes(1);
  });
});
