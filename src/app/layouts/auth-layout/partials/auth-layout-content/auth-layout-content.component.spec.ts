import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthLayoutContent } from './auth-layout-content.component';

@Component({
  imports: [AuthLayoutContent],
  template: `
    <app-auth-layout-content>
      <div id="projected-content">Projected Content</div>
    </app-auth-layout-content>
  `,
})
class HostComponent {}

describe('AuthLayoutContent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HostComponent],
    });
  });

  it('should project content inside main container', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();

    const main = fixture.nativeElement.querySelector('main');
    const projected = fixture.nativeElement.querySelector('#projected-content');

    expect(main).not.toBeNull();
    expect(projected).not.toBeNull();
    expect(projected.textContent).toContain('Projected Content');
  });
});
