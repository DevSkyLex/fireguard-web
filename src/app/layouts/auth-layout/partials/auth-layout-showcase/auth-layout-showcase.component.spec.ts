import { TestBed } from '@angular/core/testing';
import { AuthLayoutShowcase } from './auth-layout-showcase.component';

describe('AuthLayoutShowcase', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AuthLayoutShowcase],
    });
  });

  it('should render showcase branding and headline', () => {
    const fixture = TestBed.createComponent(AuthLayoutShowcase);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Fireguard');
    expect(text).toContain('The future of fire safety');
  });
});
