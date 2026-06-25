import { TestBed } from '@angular/core/testing';
import { AuthShowcase } from '../auth-showcase.component';

describe('AuthShowcase', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AuthShowcase],
    });
  });

  it('should render showcase branding and headline', () => {
    const fixture = TestBed.createComponent(AuthShowcase);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Fireguard');
    expect(text).toContain('The future of fire safety');
  });
});
