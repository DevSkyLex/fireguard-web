import { Component } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DashboardSidebarService } from '../../services';
import { DashboardSidebarResizeHandleDirective } from './dashboard-sidebar-resize-handle.directive';

type PointerEventOptions = {
  readonly pointerId?: number;
  readonly clientX?: number;
  readonly pointerType?: string;
  readonly button?: number;
};

const createPointerEvent = (type: string, options: PointerEventOptions = {}): Event => {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperties(event, {
    pointerId: { value: options.pointerId ?? 1 },
    clientX: { value: options.clientX ?? 0 },
    pointerType: { value: options.pointerType ?? 'mouse' },
    button: { value: options.button ?? 0 },
  });

  return event;
};

const dispatchPointerEvent = (
  target: EventTarget,
  type: string,
  options: PointerEventOptions = {},
): Event => {
  const event = createPointerEvent(type, options);
  target.dispatchEvent(event);
  return event;
};

const dispatchKeydown = (target: EventTarget, key: string, shiftKey: boolean = false): boolean => {
  const event = new KeyboardEvent('keydown', {
    key,
    shiftKey,
    bubbles: true,
    cancelable: true,
  });

  return target.dispatchEvent(event);
};

const getHandle = (fixture: ComponentFixture<TestHostComponent>): HTMLButtonElement => {
  const debugElement = fixture.debugElement.query(
    By.css('button[appDashboardSidebarResizeHandle]'),
  );
  return debugElement.nativeElement as HTMLButtonElement;
};

const getAside = (fixture: ComponentFixture<TestHostComponent>): HTMLElement => {
  const debugElement = fixture.debugElement.query(By.css('aside'));
  return debugElement.nativeElement as HTMLElement;
};

const createDomRect = (left: number): DOMRect => new DOMRect(left, 0, 0, 0);

@Component({
  standalone: true,
  imports: [DashboardSidebarResizeHandleDirective],
  template: `
    <aside>
      <button type="button" appDashboardSidebarResizeHandle></button>
    </aside>
  `,
})
class TestHostComponent {}

describe('DashboardSidebarResizeHandleDirective', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TestHostComponent],
      providers: [DashboardSidebarService],
    });
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();

    const directiveDebugElement = fixture.debugElement.query(
      By.directive(DashboardSidebarResizeHandleDirective),
    );
    expect(directiveDebugElement).toBeTruthy();
  });

  it('should resize sidebar on pointer move and cleanup on pointerup', () => {
    const fixture = TestBed.createComponent(TestHostComponent);
    const sidebarService = TestBed.inject(DashboardSidebarService);
    const setWidthSpy = vi.spyOn(sidebarService, 'setWidth');

    fixture.detectChanges();
    const handle = getHandle(fixture);
    const aside = getAside(fixture);
    const setPointerCaptureSpy = vi.fn();
    Object.defineProperty(handle, 'setPointerCapture', {
      configurable: true,
      value: setPointerCaptureSpy,
    });
    vi.spyOn(aside, 'getBoundingClientRect').mockReturnValue(createDomRect(80));

    dispatchPointerEvent(handle, 'pointerdown', { pointerId: 7, pointerType: 'mouse', button: 0 });
    expect(setPointerCaptureSpy).toHaveBeenCalledWith(7);
    expect(document.body.style.cursor).toBe('col-resize');
    expect(document.body.style.userSelect).toBe('none');

    dispatchPointerEvent(document, 'pointermove', { pointerId: 7, clientX: 300 });
    expect(setWidthSpy).toHaveBeenCalledWith(220);

    dispatchPointerEvent(document, 'pointerup', { pointerId: 7 });
    expect(document.body.style.cursor).toBe('');
    expect(document.body.style.userSelect).toBe('');
  });

  it('should ignore non-left mouse pointerdown', () => {
    const fixture = TestBed.createComponent(TestHostComponent);
    const sidebarService = TestBed.inject(DashboardSidebarService);
    const setWidthSpy = vi.spyOn(sidebarService, 'setWidth');

    fixture.detectChanges();
    const handle = getHandle(fixture);

    dispatchPointerEvent(handle, 'pointerdown', { pointerId: 5, pointerType: 'mouse', button: 1 });
    dispatchPointerEvent(document, 'pointermove', { pointerId: 5, clientX: 280 });

    expect(setWidthSpy).not.toHaveBeenCalled();
    expect(document.body.style.cursor).toBe('');
    expect(document.body.style.userSelect).toBe('');
  });

  it('should resize sidebar with keyboard shortcuts', () => {
    const fixture = TestBed.createComponent(TestHostComponent);
    const sidebarService = TestBed.inject(DashboardSidebarService);

    fixture.detectChanges();
    const handle = getHandle(fixture);
    sidebarService.setWidth(320);

    const leftHandled = dispatchKeydown(handle, 'ArrowLeft');
    expect(leftHandled).toBe(false);
    expect(sidebarService.width()).toBe(304);

    const rightHandled = dispatchKeydown(handle, 'ArrowRight', true);
    expect(rightHandled).toBe(false);
    expect(sidebarService.width()).toBe(336);

    const homeHandled = dispatchKeydown(handle, 'Home');
    expect(homeHandled).toBe(false);
    expect(sidebarService.width()).toBe(sidebarService.minWidth());

    const endHandled = dispatchKeydown(handle, 'End');
    expect(endHandled).toBe(false);
    expect(sidebarService.width()).toBe(sidebarService.maxWidth());
  });

  it('should cleanup listeners when destroyed during an active resize', () => {
    const fixture = TestBed.createComponent(TestHostComponent);
    const sidebarService = TestBed.inject(DashboardSidebarService);
    const setWidthSpy = vi.spyOn(sidebarService, 'setWidth');

    fixture.detectChanges();
    const handle = getHandle(fixture);

    dispatchPointerEvent(handle, 'pointerdown', { pointerId: 11, pointerType: 'mouse', button: 0 });
    fixture.destroy();
    dispatchPointerEvent(document, 'pointermove', { pointerId: 11, clientX: 340 });

    expect(setWidthSpy).not.toHaveBeenCalled();
    expect(document.body.style.cursor).toBe('');
    expect(document.body.style.userSelect).toBe('');
  });
});
