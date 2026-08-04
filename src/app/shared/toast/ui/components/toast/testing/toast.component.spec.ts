import { TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';
import { Toast } from '../toast.component';

describe('Toast', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [Toast],
      providers: [MessageService],
    });
  });

  it('creates', () => {
    const fixture = TestBed.createComponent(Toast);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders the deck host with the CSS scoping class instead of ::ng-deep', () => {
    const fixture = TestBed.createComponent(Toast);
    fixture.detectChanges();

    const host: HTMLElement = fixture.nativeElement;
    expect(host.querySelector('p-toast.app-toast-deck')).toBeTruthy();
  });

  it('renders a success message with a green status dot, the title and an a11y label', () => {
    const fixture = TestBed.createComponent(Toast);
    fixture.detectChanges();

    TestBed.inject(MessageService).add({
      severity: 'success',
      summary: 'Saved to library',
      data: { createdAt: Date.now() },
    });
    fixture.detectChanges();

    const host: HTMLElement = fixture.nativeElement;
    expect(host.textContent).toContain('Saved to library');
    expect(host.textContent).toContain('now');
    expect(host.querySelector('span.rounded-full.bg-green-500')).toBeTruthy();
    expect(host.querySelector('.sr-only')?.textContent).toContain('Success');
  });

  it('uses a red status dot for error severity', () => {
    const fixture = TestBed.createComponent(Toast);
    fixture.detectChanges();

    TestBed.inject(MessageService).add({ severity: 'error', summary: 'Boom' });
    fixture.detectChanges();

    expect(
      (fixture.nativeElement as HTMLElement).querySelector('span.rounded-full.bg-red-500'),
    ).toBeTruthy();
  });

  it('uses a neutral surface status dot for info severity', () => {
    const fixture = TestBed.createComponent(Toast);
    fixture.detectChanges();

    TestBed.inject(MessageService).add({ severity: 'info', summary: 'Heads up' });
    fixture.detectChanges();

    expect(
      (fixture.nativeElement as HTMLElement).querySelector('span.rounded-full.bg-surface-400'),
    ).toBeTruthy();
  });
});
