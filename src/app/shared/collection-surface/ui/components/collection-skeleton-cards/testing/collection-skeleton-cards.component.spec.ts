import {
  ChangeDetectionStrategy,
  Component,
  provideZonelessChangeDetection,
  signal,
  type WritableSignal,
} from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { CollectionSkeletonCards } from '../collection-skeleton-cards.component';

@Component({
  selector: 'app-collection-skeleton-cards-host',
  imports: [CollectionSkeletonCards],
  template: '<app-collection-skeleton-cards [rows]="rows()" />',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class Host {
  public readonly rows: WritableSignal<number> = signal<number>(3);
}

describe('CollectionSkeletonCards', () => {
  let fixture: ComponentFixture<Host>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [Host],
      providers: [provideZonelessChangeDetection()],
    });

    fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
  });

  it('renders two Spartan skeleton lines per requested item with separators between items', () => {
    const root: HTMLElement = fixture.nativeElement as HTMLElement;

    expect(root.querySelectorAll('hlm-skeleton')).toHaveLength(9);
    expect(root.querySelectorAll('hlm-item-separator')).toHaveLength(2);
    expect(root.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });

  it('updates the placeholder count without changing the shared composition', async () => {
    fixture.componentInstance.rows.set(1);
    await fixture.whenStable();

    const root: HTMLElement = fixture.nativeElement as HTMLElement;

    expect(root.querySelectorAll('hlm-skeleton')).toHaveLength(3);
    expect(root.querySelectorAll('hlm-item-separator')).toHaveLength(0);
  });
});
