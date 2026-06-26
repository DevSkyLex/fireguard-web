import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SPLIT_LAYOUT_CONTENT_MAX_WIDTH } from '../../../slots/content';
import { SplitLayoutContent } from '../split-layout-content.component';

@Component({
  imports: [SplitLayoutContent],
  template: `
    <app-split-layout-content>
      <div id="projected-content">Projected Content</div>
    </app-split-layout-content>
  `,
})
class HostComponent {}

describe('SplitLayoutContent', () => {
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

  it('applies the default content max-width', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();

    const main = fixture.nativeElement.querySelector('main') as HTMLElement;
    expect(main.classList).toContain('max-w-3xl');
  });

  it('applies a route-provided content max-width override', () => {
    TestBed.overrideProvider(SPLIT_LAYOUT_CONTENT_MAX_WIDTH, { useValue: 'max-w-4xl' });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();

    const main = fixture.nativeElement.querySelector('main') as HTMLElement;
    expect(main.classList).toContain('max-w-4xl');
    expect(main.classList).not.toContain('max-w-3xl');
  });
});
