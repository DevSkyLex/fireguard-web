import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { MaintenanceExportActionForm } from '../maintenance-export-action-form.component';

describe('MaintenanceExportActionForm contract limits', () => {
  let fixture: ComponentFixture<MaintenanceExportActionForm>, submitted: string[];
  const submit = async (text: string): Promise<void> => {
    const element = (fixture.nativeElement as HTMLElement).querySelector<
      HTMLInputElement | HTMLTextAreaElement
    >('#maintenance-export-action-value');
    if (!element) throw new Error('Native action field missing.');
    element.value = text;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
    (fixture.nativeElement as HTMLElement)
      .querySelector('form')
      ?.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
  };
  beforeEach(async () => {
    fixture = TestBed.createComponent(MaintenanceExportActionForm);
    submitted = [];
    fixture.componentInstance.submitted.subscribe((value) => submitted.push(value));
    await fixture.whenStable();
  });
  it('accepts adjustment reasons up to 1000 characters and rejects the next character', async () => {
    await submit('R'.repeat(1000));
    await submit('R'.repeat(1001));
    expect(submitted).toEqual(['R'.repeat(1000)]);
  });
  it('accepts an actual import reference up to 200 characters and rejects 201', async () => {
    fixture.componentRef.setInput('confirmation', true);
    await fixture.whenStable();
    await submit('I'.repeat(200));
    await submit('I'.repeat(201));
    expect(submitted).toEqual(['I'.repeat(200)]);
  });
  it('preserves a non-ASCII reason within its character limit', async () => {
    await submit('é'.repeat(1000));
    expect(submitted).toEqual(['é'.repeat(1000)]);
  });
  it('counts Unicode code points consistently with the server for supplementary characters', async () => {
    fixture.componentRef.setInput('confirmation', true);
    await fixture.whenStable();
    await submit('🔥'.repeat(200));
    await submit('🔥'.repeat(201));
    expect(submitted).toEqual(['🔥'.repeat(200)]);
  });
});
