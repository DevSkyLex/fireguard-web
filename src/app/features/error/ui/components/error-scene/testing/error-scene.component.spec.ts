import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NgIcon } from '@ng-icons/core';
import { ErrorScene } from '../error-scene.component';

describe('ErrorScene', () => {
  let fixture: ComponentFixture<ErrorScene>;

  async function render(): Promise<void> {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(ErrorScene);
    fixture.componentRef.setInput('code', '404');
    fixture.componentRef.setInput('primaryIcon', 'lucideMapPin');
    fixture.componentRef.setInput('secondaryIcon', 'lucideRoute');
    fixture.componentRef.setInput('accentIcon', 'lucideCompass');
    await fixture.whenStable();
  }

  function iconNames(): ReadonlyArray<string> {
    return fixture.debugElement
      .queryAll(By.directive(NgIcon))
      .map((debugElement) => (debugElement.componentInstance as NgIcon).name() as string);
  }

  it('renders the status code as text', async () => {
    await render();

    expect((fixture.nativeElement.textContent as string).trim()).toBe('404');
  });

  it('renders the three given icon names, unaltered by the scene', async () => {
    await render();

    expect(iconNames()).toEqual(['lucideMapPin', 'lucideRoute', 'lucideCompass']);
  });

  it('hides the decorative figure from assistive technology, leaving only the code readable', async () => {
    await render();

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    const hidden: HTMLElement | null = host.querySelector('[aria-hidden="true"]');

    expect(hidden).not.toBeNull();
    expect(hidden?.querySelectorAll('ng-icon').length).toBe(3);
    expect(host.querySelector('p')?.closest('[aria-hidden="true"]')).toBeNull();
  });

  it('swaps every icon when a different status is rendered', async () => {
    await render();

    fixture.componentRef.setInput('code', '500');
    fixture.componentRef.setInput('primaryIcon', 'lucideSettings');
    fixture.componentRef.setInput('secondaryIcon', 'lucideWrench');
    fixture.componentRef.setInput('accentIcon', 'lucideServerCrash');
    await fixture.whenStable();

    expect((fixture.nativeElement.textContent as string).trim()).toBe('500');
    expect(iconNames()).toEqual(['lucideSettings', 'lucideWrench', 'lucideServerCrash']);
  });
});
