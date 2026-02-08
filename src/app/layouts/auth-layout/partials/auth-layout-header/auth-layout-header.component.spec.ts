import { TestBed } from '@angular/core/testing';
import { AuthLayoutHeader } from './auth-layout-header.component';

describe('AuthLayoutHeader', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AuthLayoutHeader],
    });
  });

  it('should render header element', () => {
    const fixture = TestBed.createComponent(AuthLayoutHeader);
    fixture.detectChanges();

    const header = fixture.nativeElement.querySelector('header');
    expect(header).not.toBeNull();
  });
});
