import { Component, viewChild, type Signal, type TemplateRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PageTabsService } from '../page-tabs.service';

@Component({
  imports: [],
  template: `
    <ng-template #first></ng-template>
    <ng-template #second></ng-template>
  `,
})
class TemplatesHost {
  public readonly first: Signal<TemplateRef<unknown> | undefined> =
    viewChild<TemplateRef<unknown>>('first');
  public readonly second: Signal<TemplateRef<unknown> | undefined> =
    viewChild<TemplateRef<unknown>>('second');
}

describe('PageTabsService', () => {
  let service: PageTabsService;
  let fixture: ComponentFixture<TemplatesHost>;
  let first: TemplateRef<unknown>;
  let second: TemplateRef<unknown>;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [PageTabsService] });
    service = TestBed.inject(PageTabsService);
    fixture = TestBed.createComponent(TemplatesHost);
    fixture.detectChanges();
    first = fixture.componentInstance.first() as TemplateRef<unknown>;
    second = fixture.componentInstance.second() as TemplateRef<unknown>;
  });

  it('should expose no tab template by default', () => {
    expect(service.tabs()).toBeNull();
  });

  it('should expose the most recently registered template', () => {
    service.register(first);
    service.register(second);

    expect(service.tabs()).toBe(second);
  });

  it("should ignore a stale owner releasing another page's template", () => {
    service.register(second);
    service.clear(first);

    expect(service.tabs()).toBe(second);
  });

  it('should clear the template that still owns the slot', () => {
    service.register(first);
    service.clear(first);

    expect(service.tabs()).toBeNull();
  });
});
