import { TestBed } from '@angular/core/testing';
import { OrganizationDomainForm } from '../organization-domain-form.component';
describe('OrganizationDomainForm', () => {
  it('rejects an email address or URL and emits an exact domain', () => {
    const fixture = TestBed.createComponent(OrganizationDomainForm);
    fixture.detectChanges();
    const emitted = vi.fn();
    fixture.componentInstance.submitted.subscribe(emitted);
    for (const domain of ['', 'person@company.test', 'https://company.test']) {
      fixture.componentInstance['model'].set({ domain });
      fixture.detectChanges();
      fixture.componentInstance['submit'](new Event('submit'));
    }
    expect(emitted).not.toHaveBeenCalled();
    fixture.componentInstance['model'].set({ domain: 'company.test' });
    fixture.detectChanges();
    fixture.componentInstance['submit'](new Event('submit'));
    expect(emitted).toHaveBeenCalledWith('company.test');
  });
});
