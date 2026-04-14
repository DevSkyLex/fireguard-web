import { TestBed } from '@angular/core/testing';
import { SplitLayoutShowcase } from '../split-layout-showcase.component';

describe('SplitLayoutShowcase', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SplitLayoutShowcase],
    });
  });

  it('should render showcase branding and headline', () => {
    const fixture = TestBed.createComponent(SplitLayoutShowcase);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Fireguard');
    expect(text).toContain('The future of fire safety');
  });
});

