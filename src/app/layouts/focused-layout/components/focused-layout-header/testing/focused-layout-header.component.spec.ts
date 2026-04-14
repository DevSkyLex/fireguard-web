import { TestBed } from '@angular/core/testing';
import { FocusedLayoutHeader } from '../focused-layout-header.component';

describe('FocusedLayoutHeader', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [FocusedLayoutHeader],
    });
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(FocusedLayoutHeader);
    const component = fixture.componentInstance;

    expect(component).toBeTruthy();
  });
});

