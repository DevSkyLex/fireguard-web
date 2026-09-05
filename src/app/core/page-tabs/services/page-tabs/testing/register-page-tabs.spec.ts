import {
  Component,
  provideZonelessChangeDetection,
  signal,
  type DestroyRef,
  type TemplateRef,
  type WritableSignal,
} from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { PageTabsService } from '../page-tabs.service';
import { registerPageTabs } from '../register-page-tabs';

describe('registerPageTabs', () => {
  let template: WritableSignal<TemplateRef<unknown> | undefined>;
  let register: ReturnType<typeof vi.fn>;
  let clear: ReturnType<typeof vi.fn>;
  let destroyed: (() => void) | undefined;
  let fixture: ComponentFixture<unknown>;

  @Component({ template: '' })
  class Host {
    public constructor() {
      registerPageTabs(
        template,
        { register, clear } as unknown as PageTabsService,
        { onDestroy: (callback: () => void): void => void (destroyed = callback) } as DestroyRef,
      );
    }
  }

  beforeEach(() => {
    template = signal<TemplateRef<unknown> | undefined>(undefined);
    register = vi.fn();
    clear = vi.fn();
    destroyed = undefined;
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  it('should register once the template resolves', async () => {
    const ref: TemplateRef<unknown> = {} as TemplateRef<unknown>;
    template.set(ref);
    await fixture.whenStable();

    expect(register).toHaveBeenCalledWith(ref);
  });

  it('should release the current template on destroy', () => {
    const ref: TemplateRef<unknown> = {} as TemplateRef<unknown>;
    template.set(ref);
    destroyed?.();

    expect(clear).toHaveBeenCalledWith(ref);
  });
});
