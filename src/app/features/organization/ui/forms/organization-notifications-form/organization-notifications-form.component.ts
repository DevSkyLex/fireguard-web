import {
  computed,
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
} from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { toServerFieldErrors, toUnmatchedViolations, type ServerFieldErrors } from '@core/api';
import type { OrganizationOutput, UpdateOrganizationInput } from '@features/organization/models';

/**
 * Component OrganizationNotificationsForm
 * @class OrganizationNotificationsForm
 *
 * @description
 * Presentational form for an organization's notification policy: delivery
 * channels (email, in-app) and the event categories that generate
 * notifications. Field changes are emitted through `submitted` as a partial
 * {@link UpdateOrganizationInput}. The form owns no navigation, store, or API
 * access.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-notifications-form',
  imports: [ButtonModule, ReactiveFormsModule, ToggleSwitchModule, MessageModule],
  templateUrl: './organization-notifications-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationNotificationsForm {
  //#region Properties
  /** Active organization whose notification policy is being edited. */
  public readonly organization: InputSignal<OrganizationOutput | null> =
    input<OrganizationOutput | null>(null);
  /** Whether the settings submission is pending. */
  public readonly saving: InputSignal<boolean> = input<boolean>(false);

  /**
   * Input serverError
   * @input
   *
   * @description
   * Last rejection from the parent page, as held by the store's call state.
   *
   * A 422 names the field the server refused; projecting it tells the user which
   * one to fix instead of leaving them with a generic toast.
   *
   * @access public
   * @since 1.1.0
   *
   * @type {InputSignal<unknown>}
   */
  public readonly serverError: InputSignal<unknown> = input<unknown>(null);

  /** Server message per field, projected from the last 422. */
  protected readonly serverFieldErrors: Signal<ServerFieldErrors> = computed(() =>
    toServerFieldErrors(this.serverError()),
  );

  /** Message of the first violation naming no field of this form. */
  protected readonly unmatchedViolation: Signal<string | null> = computed(
    () =>
      toUnmatchedViolations(this.serverError(), [
        'emailEnabled',
        'inAppEnabled',
        'interventionPublished',
        'interventionAssigned',
        'inspectionDue',
        'nonConformityOpened',
        'memberInvited',
      ])[0]?.message ?? null,
  );

  /** Emits the notification policy slice of the settings payload. */
  public readonly submitted: OutputEmitterRef<UpdateOrganizationInput> = output();

  /** Non-nullable builder preserving strict form value types. */
  private readonly formBuilder: NonNullableFormBuilder =
    inject<NonNullableFormBuilder>(NonNullableFormBuilder);

  /** Strictly typed notification policy form. */
  protected readonly form = this.formBuilder.group({
    emailEnabled: this.formBuilder.control(true),
    inAppEnabled: this.formBuilder.control(true),
    interventionPublished: this.formBuilder.control(true),
    interventionAssigned: this.formBuilder.control(true),
    inspectionDue: this.formBuilder.control(true),
    nonConformityOpened: this.formBuilder.control(true),
    memberInvited: this.formBuilder.control(true),
  });
  //#endregion

  //#region Methods
  /** Synchronizes existing notification settings and submission state. */
  public constructor() {
    effect(() => {
      const notifications = this.organization()?.settings?.notifications;
      this.form.reset(
        {
          emailEnabled: notifications?.emailEnabled ?? true,
          inAppEnabled: notifications?.inAppEnabled ?? true,
          interventionPublished: notifications?.interventionPublished ?? true,
          interventionAssigned: notifications?.interventionAssigned ?? true,
          inspectionDue: notifications?.inspectionDue ?? true,
          nonConformityOpened: notifications?.nonConformityOpened ?? true,
          memberInvited: notifications?.memberInvited ?? true,
        },
        { emitEvent: false },
      );
    });

    effect(() =>
      this.saving()
        ? this.form.disable({ emitEvent: false })
        : this.form.enable({ emitEvent: false }),
    );
  }

  /** Emits the notification policy as a settings update payload. */
  protected submit(): void {
    this.submitted.emit({ notifications: this.form.getRawValue() });
  }
  //#endregion
}
