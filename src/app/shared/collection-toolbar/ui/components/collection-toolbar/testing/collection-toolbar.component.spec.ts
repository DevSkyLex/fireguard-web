import { ChangeDetectionStrategy, Component, provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { CollectionToolbar } from '../collection-toolbar.component';

@Component({
  selector: 'app-collection-toolbar-host',
  imports: [CollectionToolbar],
  template: `
    <app-collection-toolbar>
      <span toolbarStart data-testid="start-content">start</span>
      <span toolbarEnd data-testid="end-content">end</span>
    </app-collection-toolbar>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class CollectionToolbarHost {}

describe('CollectionToolbar', () => {
  let fixture: ComponentFixture<CollectionToolbarHost>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [CollectionToolbarHost],
      providers: [provideZonelessChangeDetection()],
    });

    fixture = TestBed.createComponent(CollectionToolbarHost);
    await fixture.whenStable();
  });

  function byTestId(testId: string): HTMLElement | null {
    return fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);
  }

  it('should project toolbarStart content into the start slot', () => {
    const startSlot: HTMLElement | null = fixture.nativeElement.querySelector(
      'app-collection-toolbar > div > div:first-child',
    );

    expect(startSlot?.querySelector('[data-testid="start-content"]')).not.toBeNull();
  });

  it('should project toolbarEnd content into the end slot', () => {
    const endSlot: HTMLElement | null = fixture.nativeElement.querySelector(
      'app-collection-toolbar > div > div:last-child',
    );

    expect(endSlot?.querySelector('[data-testid="end-content"]')).not.toBeNull();
  });

  it('should render both projected texts', () => {
    expect(byTestId('start-content')?.textContent).toContain('start');
    expect(byTestId('end-content')?.textContent).toContain('end');
  });
});
