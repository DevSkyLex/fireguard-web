import { TestBed } from '@angular/core/testing';
import type { OrganizationAccessPolicyOutput } from '@features/organization/models';
import { OrganizationAccessPolicyForm } from '../organization-access-policy-form.component';
const POLICY: OrganizationAccessPolicyOutput = {
  '@id': '/policy',
  '@type': 'AccessPolicy',
  mode: 'invitation_only',
  domains: [],
  eligibleRoles: [{ id: 'member', label: 'Member' }],
};
describe('OrganizationAccessPolicyForm', () => {
  it('keeps an edited policy through domain and catalog refreshes, then resets after a saved revision', () => {
    const fixture = TestBed.createComponent(OrganizationAccessPolicyForm);
    fixture.componentRef.setInput('policy', POLICY);
    fixture.detectChanges();
    fixture.componentInstance['model'].set({ mode: 'automatic', roleId: 'member' });
    fixture.componentRef.setInput('policy', {
      ...POLICY,
      eligibleRoles: [{ id: 'member', label: 'Team member' }],
    });
    fixture.detectChanges();
    expect(fixture.componentInstance['model']()).toEqual({ mode: 'automatic', roleId: 'member' });
    expect(fixture.nativeElement.querySelector('#access-role')?.textContent).toContain(
      'Team member',
    );
    fixture.componentRef.setInput('policyRevision', 1);
    fixture.detectChanges();
    expect(fixture.componentInstance['model']()).toEqual({ mode: 'invitation_only', roleId: '' });
    fixture.componentInstance['model'].set({ mode: 'approval_required', roleId: '' });
    fixture.componentRef.setInput('policy', { ...POLICY, '@id': '/other-organization/policy' });
    fixture.detectChanges();
    expect(fixture.componentInstance['model']()).toEqual({ mode: 'invitation_only', roleId: '' });
  });

  it('renders the label of a persisted role before opening its select', () => {
    const fixture = TestBed.createComponent(OrganizationAccessPolicyForm);
    fixture.componentRef.setInput('policy', { ...POLICY, mode: 'automatic', roleId: 'member' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#access-role')?.textContent?.trim()).toBe('Member');
  });

  it('emits invitation policy directly and automatic policy only after confirmation', () => {
    const fixture = TestBed.createComponent(OrganizationAccessPolicyForm);
    fixture.componentRef.setInput('policy', POLICY);
    fixture.detectChanges();
    const emitted = vi.fn();
    fixture.componentInstance.submitted.subscribe(emitted);
    fixture.componentInstance['submit'](new Event('submit'));
    expect(emitted).toHaveBeenCalledWith({ mode: 'invitation_only' });
    emitted.mockClear();
    fixture.componentInstance['model'].set({ mode: 'automatic', roleId: 'member' });
    fixture.detectChanges();
    fixture.componentInstance['submit'](new Event('submit'));
    expect(emitted).not.toHaveBeenCalled();
    expect(fixture.componentInstance['confirming']()).toBe(true);
    fixture.componentInstance['confirm']();
    expect(emitted).toHaveBeenCalledWith({ mode: 'automatic', roleId: 'member' });
  });
  it('requires an eligible role and prevents duplicate submission while saving', () => {
    const fixture = TestBed.createComponent(OrganizationAccessPolicyForm);
    fixture.componentRef.setInput('policy', POLICY);
    fixture.detectChanges();
    const emitted = vi.fn();
    fixture.componentInstance.submitted.subscribe(emitted);
    fixture.componentInstance['model'].set({ mode: 'automatic', roleId: '' });
    fixture.detectChanges();
    fixture.componentInstance['submit'](new Event('submit'));
    expect(emitted).not.toHaveBeenCalled();
    expect(fixture.componentInstance['policyForm'].roleId().invalid()).toBe(true);
    fixture.componentRef.setInput('pending', true);
    fixture.componentInstance['model'].set({ mode: 'invitation_only', roleId: '' });
    fixture.detectChanges();
    fixture.componentInstance['submit'](new Event('submit'));
    expect(emitted).not.toHaveBeenCalled();
  });
});
