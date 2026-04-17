import { TestBed } from '@angular/core/testing';
import { OrganizationSwitcherFooter } from '../organization-switcher-footer.component';

describe('OrganizationSwitcherFooter', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [OrganizationSwitcherFooter],
    });
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(OrganizationSwitcherFooter);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the "Create organization" button', () => {
    const fixture = TestBed.createComponent(OrganizationSwitcherFooter);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Create organization');
  });

  it('should emit createOrganization when the button is clicked', () => {
    const fixture = TestBed.createComponent(OrganizationSwitcherFooter);
    fixture.detectChanges();

    const emitSpy = vi.fn();
    fixture.componentInstance.createOrganization.subscribe(emitSpy);

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    button.click();

    expect(emitSpy).toHaveBeenCalledTimes(1);
  });
});
