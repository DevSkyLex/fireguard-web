import { Component, viewChild, type Signal, type TemplateRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PageActionsService } from '../page-actions.service';

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

describe('PageActionsService', () => {
  let service: PageActionsService;
  let templatesFixture: ComponentFixture<TemplatesHost>;
  let first: TemplateRef<unknown>;
  let second: TemplateRef<unknown>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PageActionsService],
    });

    service = TestBed.inject(PageActionsService);

    templatesFixture = TestBed.createComponent(TemplatesHost);
    templatesFixture.detectChanges();

    first = templatesFixture.componentInstance.first() as TemplateRef<unknown>;
    second = templatesFixture.componentInstance.second() as TemplateRef<unknown>;
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  it('should expose no actions template by default', () => {
    expect(service.actions()).toBeNull();
  });

  it('should expose the registered template', () => {
    service.register(first);

    expect(service.actions()).toBe(first);
  });

  it('should let the last registration win when a page re-registers', () => {
    service.register(first);
    service.register(second);

    expect(service.actions()).toBe(second);
  });

  it('should clear only when the given template is still the registered one', () => {
    service.register(second);

    service.clear(first);

    expect(service.actions()).toBe(second);
  });

  it('should clear when the given template matches the registered one', () => {
    service.register(first);

    service.clear(first);

    expect(service.actions()).toBeNull();
  });

  it('should clear unconditionally when called without a template', () => {
    service.register(first);

    service.clear();

    expect(service.actions()).toBeNull();
  });

  it('should clear unconditionally when called with an explicit undefined template', () => {
    service.register(first);

    service.clear(undefined);

    expect(service.actions()).toBeNull();
  });

  it('should keep the registered template across repeated registrations, unaware of navigation', () => {
    service.register(first);
    service.register(first);

    expect(service.actions()).toBe(first);
  });
});
