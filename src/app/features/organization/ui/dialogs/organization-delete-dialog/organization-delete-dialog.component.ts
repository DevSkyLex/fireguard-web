import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  model,
  output,
  signal,
  type InputSignal,
  type ModelSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';

/**
 * Component OrganizationDeleteDialog
 * @class OrganizationDeleteDialog
 *
 * @description
 * Confirmation dialog for permanently deleting an organization. The destructive
 * action is enabled only once the user retypes the organization slug, guarding
 * against accidental deletion. The dialog owns no store or API access: it emits
 * `confirmed` for the parent page to perform the deletion.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-delete-dialog',
  imports: [ButtonModule, DialogModule, InputTextModule, MessageModule],
  templateUrl: './organization-delete-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationDeleteDialog {
  //#region Properties
  /** Two-way dialog visibility. */
  public readonly visible: ModelSignal<boolean> = model<boolean>(false);
  /** Organization slug the user must retype to confirm. */
  public readonly organizationSlug: InputSignal<string> = input<string>('');
  /** Organization display name shown in the warning copy. */
  public readonly organizationName: InputSignal<string> = input<string>('');
  /** Whether the deletion request is in progress. */
  public readonly deleting: InputSignal<boolean> = input<boolean>(false);
  /** Emits when the user confirms the deletion. */
  public readonly confirmed: OutputEmitterRef<void> = output();

  /** Live value typed in the confirmation input. */
  protected readonly typedSlug: WritableSignal<string> = signal<string>('');

  /** Whether the typed slug matches and the action may proceed. */
  protected readonly canConfirm: Signal<boolean> = computed(
    () => this.typedSlug().trim() === this.organizationSlug() && this.organizationSlug().length > 0,
  );
  //#endregion

  //#region Methods
  /** Resets the typed value whenever the dialog is reopened. */
  public constructor() {
    effect(() => {
      if (this.visible()) this.typedSlug.set('');
    });
  }

  /**
   * Method onTypedSlugInput
   *
   * @description
   * Tracks the confirmation input value.
   *
   * @param {Event} event - Input event from the confirmation field.
   * @returns {void}
   */
  protected onTypedSlugInput(event: Event): void {
    this.typedSlug.set((event.target as HTMLInputElement).value);
  }

  /** Emits the confirmation when the typed slug matches. */
  protected confirm(): void {
    if (this.canConfirm()) this.confirmed.emit();
  }

  /** Closes the dialog without deleting. */
  protected cancel(): void {
    this.visible.set(false);
  }
  //#endregion
}
