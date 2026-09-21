import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
  untracked,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import {
  form,
  FormField,
  required,
  maxLength,
  validate,
  disabled,
  type FieldTree,
} from '@angular/forms/signals';
import { toServerFieldErrors, type ServerFieldErrors } from '@core/api';
import type {
  WebhookSubscriptionOutput,
  WebhookSubscriptionInput,
  WebhookEventOutput,
} from '@features/organization/features/webhooks/models';
import { serverMessagesOf } from '@shared/form-feedback';
import { HlmButton } from '@shared/ui/button';
import { HlmCheckbox } from '@shared/ui/checkbox';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmInput } from '@shared/ui/input';
import { HlmTextarea } from '@shared/ui/textarea';
import type { WebhookDraft } from './models/webhook-draft.interface';

/**
 * Component WebhookSubscriptionForm
 * @class WebhookSubscriptionForm
 * @description Local endpoint draft with Signal Forms, catalog-driven events and partial update output. No navigation or HTTP ownership.
 * @since 1.0.0
 */
@Component({
  selector: 'app-webhook-subscription-form',
  imports: [FormField, HlmButton, HlmCheckbox, HlmInput, HlmTextarea, ...HlmFieldImports],
  templateUrl: './webhook-subscription-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WebhookSubscriptionForm {
  /**
   * Property initial
   * @readonly
   * @description Initial snapshot, unchanged after a refused save.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<WebhookSubscriptionOutput | null>}
   */
  public readonly initial: InputSignal<WebhookSubscriptionOutput | null> =
    input<WebhookSubscriptionOutput | null>(null);
  /**
   * Property events
   * @readonly
   * @description Authorized catalog entries.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly WebhookEventOutput[]>}
   */
  public readonly events: InputSignal<readonly WebhookEventOutput[]> =
    input.required<readonly WebhookEventOutput[]>();
  /**
   * Property pending
   * @readonly
   * @description Submission state.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input(false);
  /**
   * Property serverError
   * @readonly
   * @description Normalized server refusal.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<unknown>}
   */
  public readonly serverError: InputSignal<unknown> = input<unknown>(null);
  /**
   * Property submitted
   * @readonly
   * @description Only changed fields for existing subscriptions.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<Partial<WebhookSubscriptionInput>>}
   */
  public readonly submitted: OutputEmitterRef<Partial<WebhookSubscriptionInput>> =
    output<Partial<WebhookSubscriptionInput>>();
  /**
   * Property cancelled
   * @readonly
   * @description Dismissal intent.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<void>}
   */
  public readonly cancelled: OutputEmitterRef<void> = output<void>();
  /**
   * Property dirtyChanged
   * @readonly
   * @description Draft protection for the owning sheet.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<boolean>}
   */
  public readonly dirtyChanged: OutputEmitterRef<boolean> = output<boolean>();
  /**
   * Property model
   * @readonly
   * @description Editable values.
   * @access protected
   * @since 1.0.0
   * @type {WritableSignal<WebhookDraft>}
   */
  protected readonly model: WritableSignal<WebhookDraft> = signal<WebhookDraft>({
    url: '',
    description: '',
    isActive: true,
    events: [],
  });
  /**
   * Property fieldErrors
   * @readonly
   * @description Server validation matched to fields.
   * @access protected
   * @since 1.0.0
   * @type {Signal<ServerFieldErrors>}
   */
  protected readonly fieldErrors: Signal<ServerFieldErrors> = computed(() =>
    toServerFieldErrors(this.serverError()),
  );
  /**
   * Property serverMessages
   * @readonly
   * @description Global feedback keeps the draft visible.
   * @access protected
   * @since 1.0.0
   * @type {Signal<readonly string[]>}
   */
  protected readonly serverMessages: Signal<readonly string[]> = computed(() =>
    serverMessagesOf(
      this.serverError(),
      [],
      $localize`:@@webhooks.saveFailed:The webhook could not be saved.`,
    ),
  );
  /**
   * Property fields
   * @readonly
   * @description Typed field tree with local validation; the API revalidates destinations and event choices.
   * @access protected
   * @since 1.0.0
   * @type {FieldTree<WebhookDraft>}
   */
  protected readonly fields: FieldTree<WebhookDraft> = form(this.model, (path) => {
    disabled(path, { when: () => this.pending() });
    required(path.url, { message: $localize`:@@webhooks.urlRequired:Enter a destination URL.` });
    maxLength(path.description, 500);
    validate(path.url, ({ value }) => {
      try {
        const url = new URL(value());
        if (url.protocol === 'https:' && !url.username && !url.password) return null;
      } catch {}
      return {
        kind: 'url',
        message: $localize`:@@webhooks.urlInvalid:Use an HTTPS URL without credentials.`,
      };
    });
    validate(path.events, ({ value }) =>
      value().some((event) => event.checked)
        ? null
        : {
            kind: 'required',
            message: $localize`:@@webhooks.eventsRequired:Select at least one event.`,
          },
    );
  });
  /**
   * Constructor
   * @constructor
   * @description Seeds a fresh editor and reports dirty state without clearing failed submissions.
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    effect(() => {
      const initial = this.initial();
      const events = this.events();
      untracked(() =>
        this.model.set({
          url: initial?.url ?? '',
          description: initial?.description ?? '',
          isActive: initial?.isActive ?? true,
          events: events.map((event) => ({
            value: event.value,
            label: event.label,
            checked: initial?.eventTypes.includes(event.value) ?? false,
          })),
        }),
      );
    });
    effect(() => this.dirtyChanged.emit(this.fields().dirty()));
  }
  /**
   * Method submit
   * @method submit
   * @description Validates and emits the edited fields; no transport is performed here.
   * @access protected
   * @since 1.0.0
   * @param {Event} event - Native form submission.
   * @returns {void}
   */
  protected submit(event: Event): void {
    event.preventDefault();
    this.fields().markAsTouched();
    if (this.pending() || this.fields().invalid()) return;
    const draft = this.model();
    const initial = this.initial();
    const value: WebhookSubscriptionInput = {
      url: draft.url.trim(),
      description: draft.description.trim(),
      eventTypes: draft.events.filter((entry) => entry.checked).map((entry) => entry.value),
      isActive: draft.isActive,
    };
    if (!initial) {
      this.submitted.emit(value);
      return;
    }
    this.submitted.emit({
      ...(value.url !== initial.url ? { url: value.url } : {}),
      ...(value.description !== initial.description ? { description: value.description } : {}),
      ...(value.isActive !== initial.isActive ? { isActive: value.isActive } : {}),
      ...(JSON.stringify(value.eventTypes.toSorted()) !==
      JSON.stringify(initial.eventTypes.toSorted())
        ? { eventTypes: value.eventTypes }
        : {}),
    });
  }
}
