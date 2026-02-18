import { TestBed } from '@angular/core/testing';
import { SplitLayoutFooter } from './split-layout-footer.component';

describe('SplitLayoutFooter', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SplitLayoutFooter],
    });
  });

  it('should render footer and divider', () => {
    const fixture = TestBed.createComponent(SplitLayoutFooter);
    fixture.detectChanges();

    const footer = fixture.nativeElement.querySelector('footer');
    const divider = fixture.nativeElement.querySelector('p-divider');

    expect(footer).not.toBeNull();
    expect(divider).not.toBeNull();
  });
});

