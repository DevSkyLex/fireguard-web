import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { CollectionSearchBox } from '../collection-search-box.component';

describe('CollectionSearchBox', () => {
  let fixture: ComponentFixture<CollectionSearchBox>;

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(CollectionSearchBox);
    fixture.componentRef.setInput('value', 'pump');
    fixture.componentRef.setInput('placeholder', 'Search equipments...');
    fixture.componentRef.setInput('ariaLabel', 'Search equipments...');
    fixture.componentRef.setInput('testIdPrefix', 'equipments');
    await fixture.whenStable();
  });

  function input(): HTMLInputElement | null {
    return fixture.nativeElement.querySelector('input[type="search"]');
  }

  it('should render the current value', () => {
    expect(input()?.value).toBe('pump');
  });

  it('should render the given placeholder and accessible name', () => {
    expect(input()?.placeholder).toBe('Search equipments...');
    expect(input()?.getAttribute('aria-label')).toBe('Search equipments...');
  });

  it('should build the data-testid from the given prefix', () => {
    expect(input()?.getAttribute('data-testid')).toBe('equipments-search');
  });

  it('should emit queryChanged with the input value on every keystroke', () => {
    const emitted: string[] = [];
    fixture.componentInstance.queryChanged.subscribe((value: string) => emitted.push(value));

    const el = input();
    if (el) {
      el.value = 'valve';
      el.dispatchEvent(new Event('input'));
    }

    expect(emitted).toEqual(['valve']);
  });
});
