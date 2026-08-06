import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, RouterOutlet } from '@angular/router';
import { DirectMessagesPage } from '../direct-messages-page.component';

describe('DirectMessagesPage', () => {
  let fixture: ComponentFixture<DirectMessagesPage>;

  function text(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  /** Simulates the child route activating, which is what opens a conversation. */
  async function openConversation(): Promise<void> {
    fixture.debugElement.query(By.directive(RouterOutlet)).triggerEventHandler('activate', {});
    await fixture.whenStable();
  }

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    });

    fixture = TestBed.createComponent(DirectMessagesPage);
    await fixture.whenStable();
  });

  afterEach(() => TestBed.resetTestingModule());

  it('should show the empty state until a conversation is routed', () => {
    expect(text()).toContain('No conversation open');
  });

  it('should hide the empty state once a conversation is open', async () => {
    await openConversation();

    expect(text()).not.toContain('No conversation open');
  });
});
