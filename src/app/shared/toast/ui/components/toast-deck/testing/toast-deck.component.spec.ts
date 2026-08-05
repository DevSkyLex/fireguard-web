import { provideZonelessChangeDetection, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { toast } from '@spartan-ng/brain/sonner';
import { FEEDBACK_PORT, type FeedbackMessage } from '@core/feedback';
import { ToastDeck } from '../toast-deck.component';

/**
 * Builds one queued message.
 */
function message(
  id: number,
  severity: FeedbackMessage['severity'],
  summary: string,
): FeedbackMessage {
  return { id, severity, summary, detail: 'Detail', lifeMs: 8000, createdAt: 0 };
}

describe('ToastDeck', () => {
  let fixture: ComponentFixture<ToastDeck>;
  let messages: WritableSignal<readonly FeedbackMessage[]>;
  let dismiss: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    messages = signal<readonly FeedbackMessage[]>([]);
    dismiss = vi.fn();

    vi.spyOn(toast, 'error').mockReturnValue('id');
    vi.spyOn(toast, 'success').mockReturnValue('id');
    vi.spyOn(toast, 'warning').mockReturnValue('id');
    vi.spyOn(toast, 'info').mockReturnValue('id');

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: FEEDBACK_PORT, useValue: { messages, dismiss } },
      ],
    });

    fixture = TestBed.createComponent(ToastDeck);
    await fixture.whenStable();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render the sonner deck', () => {
    expect(fixture.nativeElement.querySelector('hlm-toaster')).not.toBeNull();
  });

  it('should show a queued error with its detail and its own lifetime', async () => {
    messages.set([message(1, 'error', 'Sign-in failed')]);
    await fixture.whenStable();

    expect(toast.error).toHaveBeenCalledWith('Sign-in failed', {
      description: 'Detail',
      duration: 8000,
    });
  });

  it('should drain the queue so it stays a handover buffer', async () => {
    messages.set([message(1, 'error', 'Sign-in failed')]);
    await fixture.whenStable();

    expect(dismiss).toHaveBeenCalledWith(1);
  });

  it('should use the variant matching each severity', async () => {
    // An error must not merely be a differently worded success.
    messages.set([
      message(1, 'success', 'Saved'),
      message(2, 'warn', 'Careful'),
      message(3, 'info', 'Heads up'),
    ]);
    await fixture.whenStable();

    expect(toast.success).toHaveBeenCalledWith('Saved', expect.anything());
    expect(toast.warning).toHaveBeenCalledWith('Careful', expect.anything());
    expect(toast.info).toHaveBeenCalledWith('Heads up', expect.anything());
  });

  it('should show every message of a burst', async () => {
    messages.set([message(1, 'error', 'First'), message(2, 'error', 'Second')]);
    await fixture.whenStable();

    expect(toast.error).toHaveBeenCalledTimes(2);
    expect(dismiss).toHaveBeenCalledTimes(2);
  });

  it('should do nothing while the queue is empty', () => {
    expect(toast.error).not.toHaveBeenCalled();
    expect(dismiss).not.toHaveBeenCalled();
  });
});
