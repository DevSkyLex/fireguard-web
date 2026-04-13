import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FocusedLayoutContent } from './focused-layout-content.component';

@Component({
  imports: [FocusedLayoutContent],
  template: `
    <app-focused-layout-content>
      <div id="projected-content">Projected Content</div>
    </app-focused-layout-content>
  `,
})
class HostComponent {}

describe('FocusedLayoutContent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HostComponent],
    });
  });

  it('should project content inside main container', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();

    const main: HTMLElement | null = fixture.nativeElement.querySelector('main');
    const projected: HTMLElement | null = fixture.nativeElement.querySelector('#projected-content');

    expect(main).not.toBeNull();
    expect(projected).not.toBeNull();
    expect(projected?.textContent).toContain('Projected Content');
  });
});
