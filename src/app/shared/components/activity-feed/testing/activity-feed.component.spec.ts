import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivityFeedItemDirective } from '../activity-feed-item.directive';
import { ActivityFeed } from '../activity-feed.component';
import type { ActivityFeedItem } from '../models';

const ITEMS: ActivityFeedItem[] = [
  {
    id: 'e1',
    timestamp: new Date(2026, 5, 15, 9, 0),
    authorLabel: 'Amy Elsner',
    text: 'marked this done',
    kind: 'event',
  },
  {
    id: 'c1',
    timestamp: new Date(2026, 5, 15, 9, 5),
    authorLabel: 'Onyama Limba',
    body: 'Looks good to me.',
    kind: 'comment',
  },
];

describe('ActivityFeed', () => {
  it('renders an event line and a comment card by default', () => {
    TestBed.configureTestingModule({});
    const fixture = TestBed.createComponent(ActivityFeed);
    fixture.componentRef.setInput('items', ITEMS);
    fixture.detectChanges();

    const text: string = fixture.nativeElement.textContent ?? '';
    expect(text).toContain('Amy Elsner');
    expect(text).toContain('marked this done');
    expect(text).toContain('Onyama Limba');
    expect(text).toContain('Looks good to me.');
  });

  it('shows the localized empty label when there are no items', () => {
    TestBed.configureTestingModule({});
    const fixture = TestBed.createComponent(ActivityFeed);
    fixture.componentRef.setInput('items', []);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No activity yet');
  });

  it('shows a custom empty label when provided', () => {
    TestBed.configureTestingModule({});
    const fixture = TestBed.createComponent(ActivityFeed);
    fixture.componentRef.setInput('items', []);
    fixture.componentRef.setInput('emptyLabel', 'Nothing here');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Nothing here');
  });

  it('renders a projected item template instead of the default rendering', () => {
    @Component({
      imports: [ActivityFeed, ActivityFeedItemDirective],
      template: `
        <app-activity-feed [items]="items">
          <ng-template appActivityFeedItem let-item>Custom: {{ item.authorLabel }}</ng-template>
        </app-activity-feed>
      `,
    })
    class ActivityFeedHost {
      public items: ActivityFeedItem[] = ITEMS;
    }

    const fixture = TestBed.createComponent(ActivityFeedHost);
    fixture.detectChanges();

    const text: string = fixture.nativeElement.textContent ?? '';
    expect(text).toContain('Custom: Amy Elsner');
    expect(text).toContain('Custom: Onyama Limba');
    expect(text).not.toContain('marked this done');
  });
});
