import { TestBed } from '@angular/core/testing';
import { FocusedLayoutFooter } from './focused-layout-footer.component';

describe('FocusedLayoutFooter', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [FocusedLayoutFooter],
    });
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(FocusedLayoutFooter);
    const component = fixture.componentInstance;

    expect(component).toBeTruthy();
  });
});

