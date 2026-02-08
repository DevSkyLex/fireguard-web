import { TestBed } from '@angular/core/testing';
import { AuthLayoutFooter } from './auth-layout-footer.component';

describe('AuthLayoutFooter', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AuthLayoutFooter],
    });
  });

  it('should render footer and divider', () => {
    const fixture = TestBed.createComponent(AuthLayoutFooter);
    fixture.detectChanges();

    const footer = fixture.nativeElement.querySelector('footer');
    const divider = fixture.nativeElement.querySelector('p-divider');

    expect(footer).not.toBeNull();
    expect(divider).not.toBeNull();
  });
});
