import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { toast } from '@spartan-ng/brain/sonner';
import { FeedbackService } from '@core/feedback';
import { App } from '../app.component';

describe('App', () => {
  let fixture: ComponentFixture<App>;
  let feedback: FeedbackService;

  beforeEach(async () => {
    vi.spyOn(toast, 'error').mockReturnValue('id');
    vi.spyOn(toast, 'success').mockReturnValue('id');
    vi.spyOn(toast, 'warning').mockReturnValue('id');
    vi.spyOn(toast, 'info').mockReturnValue('id');

    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    });

    feedback = TestBed.inject(FeedbackService);

    fixture = TestBed.createComponent(App);
    await fixture.whenStable();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render the routed outlet and spartan own toast deck', () => {
    // Spartan's component, not a wrapper of ours (ARCHITECTURE.md §8.5).
    expect(fixture.nativeElement.querySelector('router-outlet')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('hlm-toaster')).not.toBeNull();
  });

  it('should show a queued error with its detail and its own lifetime', async () => {
    feedback.error('Invalid credentials', 'Sign-in failed');
    await fixture.whenStable();

    expect(toast.error).toHaveBeenCalledWith(
      'Sign-in failed',
      expect.objectContaining({ description: 'Invalid credentials' }),
    );
  });

  it('should drain the queue so it stays a handover buffer', async () => {
    feedback.error('Invalid credentials', 'Sign-in failed');
    await fixture.whenStable();

    expect(feedback.messages()).toEqual([]);
  });

  it('should use the variant matching each severity', async () => {
    // An error must not merely be a differently worded success.
    feedback.success('Saved');
    feedback.warn('Careful');
    feedback.info('Heads up');
    await fixture.whenStable();

    expect(toast.success).toHaveBeenCalledTimes(1);
    expect(toast.warning).toHaveBeenCalledTimes(1);
    expect(toast.info).toHaveBeenCalledTimes(1);
  });

  it('should show every message of a burst', async () => {
    feedback.error('First');
    feedback.error('Second');
    await fixture.whenStable();

    expect(toast.error).toHaveBeenCalledTimes(2);
    expect(feedback.messages()).toEqual([]);
  });

  it('should do nothing while the queue is empty', () => {
    expect(toast.error).not.toHaveBeenCalled();
  });
});
