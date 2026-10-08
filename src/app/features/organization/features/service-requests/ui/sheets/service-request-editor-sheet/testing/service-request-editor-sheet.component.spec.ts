import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { INTERACTION_CAPABILITIES_PORT } from '@core/interaction-capabilities';
import { ServiceRequestEditorSheet } from '../service-request-editor-sheet.component';

async function render() {
  TestBed.configureTestingModule({
    imports: [ServiceRequestEditorSheet],
    providers: [
      {
        provide: INTERACTION_CAPABILITIES_PORT,
        useValue: { isMobileInteractionMode: signal(false) },
      },
    ],
  });
  TestBed.overrideComponent(ServiceRequestEditorSheet, { set: { template: '', imports: [] } });
  const fixture = TestBed.createComponent(ServiceRequestEditorSheet);
  fixture.componentRef.setInput('organizationId', 'org');
  fixture.componentRef.setInput('visible', true);
  await fixture.whenStable();
  return { fixture, sheet: fixture.componentInstance };
}

describe('ServiceRequestEditorSheet', () => {
  it('keeps a dirty draft when navigation confirmation is cancelled and resolves the next discard once', async () => {
    const { fixture, sheet } = await render();
    const dismissed = vi.fn();
    sheet.dismissed.subscribe(dismissed);
    sheet['dirty'].set(true);
    expect(sheet.hasDirty()).toBe(true);
    const first = sheet.canClose();
    expect(sheet['confirmation']()).toBe('open');
    expect(sheet.canClose()).toBe(first);
    sheet['resolveConfirmation'](false);
    expect(await first).toBe(false);
    expect(sheet.hasDirty()).toBe(true);
    expect(dismissed).not.toHaveBeenCalled();
    const second = sheet.canClose();
    sheet['discard']();
    expect(await second).toBe(true);
    expect(sheet.hasDirty()).toBe(false);
    expect(dismissed).toHaveBeenCalledOnce();
    fixture.destroy();
  });

  it('blocks native dismissal and route leave while an accepted write is pending', async () => {
    const { fixture, sheet } = await render();
    const dismissed = vi.fn();
    sheet.dismissed.subscribe(dismissed);
    sheet['dirty'].set(true);
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();
    expect(sheet.canClose()).toBe(false);
    sheet['requestClose']();
    sheet['discard']();
    expect(sheet.hasDirty()).toBe(true);
    expect(dismissed).not.toHaveBeenCalled();
  });

  it('releases an unanswered router decision when its owner is destroyed', async () => {
    const { fixture, sheet } = await render();
    sheet['dirty'].set(true);
    const decision = sheet.canClose();
    fixture.destroy();
    expect(await decision).toBe(false);
  });
});
