import {
  Component,
  provideZonelessChangeDetection,
  signal,
  type DestroyRef,
  type TemplateRef,
  type WritableSignal,
} from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { PageActionsService } from '../page-actions.service';
import { registerPageActions } from '../register-page-actions';

describe('registerPageActions', () => {
  let template: WritableSignal<TemplateRef<unknown> | undefined>;
  let register: ReturnType<typeof vi.fn>;
  let clear: ReturnType<typeof vi.fn>;
  let destroyed: (() => void) | undefined;
  let fixture: ComponentFixture<unknown>;

  @Component({ template: '' })
  class Host {
    public constructor() {
      registerPageActions(
        template,
        { register, clear } as unknown as PageActionsService,
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

  it('should not register while the template is still unresolved', () => {
    expect(register).not.toHaveBeenCalled();
  });

  it('should register once the template resolves', async () => {
    const ref: TemplateRef<unknown> = {} as TemplateRef<unknown>;
    template.set(ref);
    await fixture.whenStable();

    expect(register).toHaveBeenCalledWith(ref);
  });

  it('should re-register when the template changes', async () => {
    const first: TemplateRef<unknown> = {} as TemplateRef<unknown>;
    const second: TemplateRef<unknown> = {} as TemplateRef<unknown>;
    template.set(first);
    await fixture.whenStable();

    template.set(second);
    await fixture.whenStable();

    expect(register).toHaveBeenLastCalledWith(second);
  });

  it('should clear on destroy with whatever template is currently registered', () => {
    const ref: TemplateRef<unknown> = {} as TemplateRef<unknown>;
    template.set(ref);

    destroyed?.();

    expect(clear).toHaveBeenCalledWith(ref);
  });
});
