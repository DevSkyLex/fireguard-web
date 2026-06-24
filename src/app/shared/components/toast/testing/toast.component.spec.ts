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

  it('renders a success message with a green check icon, the title and an a11y label', () => {
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
    expect(host.querySelector('i.pi-check-circle.text-green-600')).toBeTruthy();
    expect(host.querySelector('.sr-only')?.textContent).toContain('Success');
  });

  it('uses the danger icon and colour for error severity', () => {
    const fixture = TestBed.createComponent(Toast);
    fixture.detectChanges();

    TestBed.inject(MessageService).add({ severity: 'error', summary: 'Boom' });
    fixture.detectChanges();

    expect(
      (fixture.nativeElement as HTMLElement).querySelector('i.pi-times-circle.text-red-600'),
    ).toBeTruthy();
  });
});
