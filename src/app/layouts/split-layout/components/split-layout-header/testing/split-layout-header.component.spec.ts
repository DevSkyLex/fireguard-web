import { TestBed } from '@angular/core/testing';
import { SplitLayoutHeader } from '../split-layout-header.component';

describe('SplitLayoutHeader', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SplitLayoutHeader],
    });
  });

  it('should render header element', () => {
    const fixture = TestBed.createComponent(SplitLayoutHeader);
    fixture.detectChanges();

    const header = fixture.nativeElement.querySelector('header');
    expect(header).not.toBeNull();
  });
});

