import {
  ChangeDetectionStrategy,
  Component,
  computed,
  afterNextRender,
  inject,
  Injector,
  viewChild,
  type ElementRef,
  input,
  linkedSignal,
  output,
  signal,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import {
  form,
  FormField,
  required,
  validate,
  disabled,
  type FieldTree,
} from '@angular/forms/signals';
import { NgIcon, provideIcons, provideNgIconLoader, withCaching } from '@ng-icons/core';
import {
  lucideMapPin,
  lucidePlus,
  lucidePencil,
  lucideX,
  lucideBuilding2,
  lucideLayers,
  lucideScan,
  lucideSquare,
} from '@ng-icons/lucide';
import { ONBOARDING_FACILITY_TYPE_OPTIONS } from '@features/onboarding/options';
import { OnboardingStepFooter } from '@features/onboarding/ui/components';
import { setupPayloadKey } from '@features/onboarding/utils';
import type {
  SetupCreateFacilityInput,
  SetupFacilityType,
  SetupFacilityAddressMatch,
} from '@features/organization/setup';
import { RequiredMarker } from '@shared/required-marker';
import { HlmButton } from '@shared/ui/button';
import { HlmComboboxImports } from '@shared/ui/combobox';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmInput } from '@shared/ui/input';
import { HlmInputGroupImports } from '@shared/ui/input-group';
import { HlmItemImports } from '@shared/ui/item';
import { HlmSelectImports } from '@shared/ui/select';
import { HlmSpinner } from '@shared/ui/spinner';
import type { OnboardingFacilityDraft } from './models';
import { loadAddressFlag } from './utils/address-flag/address-flag.utils';

/** Facilities the setup boundary accepts in one onboarding submission. */
const MAX_FACILITIES = 5;

/** A blank draft row. */
const EMPTY_VALUES: OnboardingFacilityDraft = {
  type: '',
  name: '',
  address: '',
  city: '',
  country: '',
  postalCode: '',
};

/**
 * Component OnboardingFacilitiesForm
 * @class OnboardingFacilitiesForm
 *
 * @description
 * The `create_first_facility` wizard step. It stages up to
 * {@link MAX_FACILITIES} rows locally and emits the whole batch with
 * {@link submitted} when the operator creates them. The fields always hold
 * the next facility: a valid draft is staged automatically on submit, so the
 * common path — one facility — is "fill the fields, create", with "Add
 * another facility" only for a second row. The batch must not be empty (the
 * backend rejects confirming this step with no facility, and does not let it
 * be skipped), so an empty submit marks the draft touched and lets the
 * required-field errors name what is missing; there is no separate message.
 *
 * No draft row is ever sent to the API on its own — staging is local state,
 * so it never touches a service (`ARCHITECTURE.md` §10.4). The wizard page
 * creates the batch through `@features/organization/setup` and confirms the
 * step via the store.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-onboarding-facilities-form [pending]="isCreating()" (submitted)="createFacilities($event)" />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-onboarding-facilities-form',
  imports: [
    ...HlmComboboxImports,
    HlmSpinner,
    RequiredMarker,
    FormField,
    HlmButton,
    HlmInput,
    ...HlmInputGroupImports,
    NgIcon,
    OnboardingStepFooter,
    ...HlmFieldImports,
    ...HlmItemImports,
    ...HlmSelectImports,
  ],
  providers: [
    provideIcons({
      lucideMapPin,
      lucidePlus,
      lucidePencil,
      lucideX,
      lucideBuilding2,
      lucideLayers,
      lucideScan,
      lucideSquare,
    }),
    provideNgIconLoader(loadAddressFlag, withCaching()),
  ],
  templateUrl: './onboarding-facilities-form.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardingFacilitiesForm {
  /**
   * Property restored
   * @readonly
   * @description Complete durable batch restored after reload or a partial creation response.
   * @access public
   * @since 1.1.0
   * @type {InputSignal<readonly SetupCreateFacilityInput[]>}
   */
  public readonly restored: InputSignal<readonly SetupCreateFacilityInput[]> = input<
    readonly SetupCreateFacilityInput[]
  >([]);

  /** Draft input focus is restored only after an explicit row edit. */
  private readonly draftInput = viewChild<ElementRef<HTMLInputElement>>('draftInput');
  private readonly injector = inject(Injector);

  /** Wait for the draft to reappear when editing a full batch. */
  private focusDraft(): void {
    afterNextRender(() => this.draftInput()?.nativeElement.focus(), { injector: this.injector });
  }

  /**
   * Method isCompleted
   * @method isCompleted
   * @description Compares durable payload identities rather than in-memory object references.
   * @access private
   * @since 1.1.0
   * @param {SetupCreateFacilityInput | undefined} row - The staged facility.
   * @returns {boolean} Whether its server receipt is complete.
   */
  private isCompleted(row: SetupCreateFacilityInput | undefined): boolean {
    return !!row && this.completed().some((done) => setupPayloadKey(done) === setupPayloadKey(row));
  }

  /** Names the staged entry edited by this action. */
  protected editFacilityLabel(name: string): string {
    return $localize`:@@onboarding.facilitiesForm.editNamed:Edit ${name}:name:`;
  }

  /** @description Successful batch entries remain visible but cannot be edited or resubmitted. */
  public readonly completed: InputSignal<readonly SetupCreateFacilityInput[]> = input<
    readonly SetupCreateFacilityInput[]
  >([]);
  public readonly failed: InputSignal<readonly string[]> = input<readonly string[]>([]);

  /**
   * Property addressMatches
   * @readonly
   * @description Address suggestions supplied by the page's search store.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly SetupFacilityAddressMatch[]>}
   */
  public readonly addressMatches: InputSignal<readonly SetupFacilityAddressMatch[]> = input<
    readonly SetupFacilityAddressMatch[]
  >([]);

  /**
   * Property addressPending
   * @readonly
   * @description Whether suggestions are being retrieved.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly addressPending: InputSignal<boolean> = input(false);

  /**
   * Property addressError
   * @readonly
   * @description Signals a recoverable search failure, distinct from no matching address.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly addressError: InputSignal<boolean> = input(false);

  /**
   * Property addressSearched
   * @readonly
   * @description Sends the current query to the page; an empty query clears pending work.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<string>}
   */
  public readonly addressSearched: OutputEmitterRef<string> = output<string>();

  /**
   * Property addressQuery
   * @readonly
   * @description Search text is separate from the selected Signal Forms value.
   * @access protected
   * @since 1.0.0
   * @type {WritableSignal<string>}
   */
  protected readonly addressQuery: WritableSignal<string> = signal('');

  /**
   * Method addressInputChanged
   * @method addressInputChanged
   * @description Searches only on user input, not on the combobox resetting its search after closing.
   * @access protected
   * @since 1.0.0
   * @param {Event} event - Native input event bubbling from the Spartan control.
   * @returns {void}
   */
  protected addressInputChanged(event: Event): void {
    const target: EventTarget | null = event.target;
    if (target instanceof HTMLInputElement) this.searchAddress(target.value);
  }

  /**
   * Property selectedAddress
   * @readonly
   * @description Last explicitly selected suggestion. Editing its label invalidates the proof.
   * @access protected
   * @since 1.0.0
   * @type {WritableSignal<SetupFacilityAddressMatch | null>}
   */
  protected readonly selectedAddress: WritableSignal<SetupFacilityAddressMatch | null> =
    signal(null);

  /**
   * Property addressFilter
   * @readonly
   * @description Preserves the server's ranked results without filtering them a second time.
   * @access protected
   * @since 1.0.0
   * @type {(value: string, search: string) => boolean}
   */
  protected readonly addressFilter: (value: string, search: string) => boolean = () => true;

  /**
   * Method searchAddress
   * @method searchAddress
   * @description Invalidates a changed address before requesting fresh suggestions.
   * @access protected
   * @since 1.0.0
   * @param {string} query - Typed address text.
   * @returns {void}
   */
  protected searchAddress(query: string): void {
    if (this.pending()) return;
    this.addressQuery.set(query);
    if (query === (this.selectedAddress()?.street ?? this.selectedAddress()?.displayName)) return;
    this.selectedAddress.set(null);
    this.model.update((draft) => ({ ...draft, address: '' }));
    this.addressSearched.emit(this.addressSearchQuery());
  }

  /**
   * Method selectAddress
   * @method selectAddress
   * @description Accepts only a suggestion currently offered by the search store.
   * @access protected
   * @since 1.0.0
   * @param {unknown} label - Selected result label.
   * @returns {void}
   */
  protected selectAddress(label: unknown): void {
    const match: SetupFacilityAddressMatch | undefined = this.addressMatches().find(
      (entry) => entry.displayName === label,
    );
    if (!match) return;
    this.selectedAddress.set(match);
    this.addressQuery.set(match.street ?? match.displayName);
    this.model.update((draft) => ({
      ...draft,
      address: match.displayName,
      city: match.city ?? '',
      country: match.country ?? '',
      postalCode: match.postalCode ?? '',
    }));
  }

  /**
   * Property stagedAddresses
   * @readonly
   * @description Keeps structured address details for editing local rows without adding metadata to creation payloads.
   * @access private
   * @since 1.0.0
   * @type {Map<string, SetupFacilityAddressMatch>}
   */
  private readonly stagedAddresses: Map<string, SetupFacilityAddressMatch> = new Map();

  /**
   * Property addressLabelOf
   * @readonly
   * @description Displays only the street in the control; suggestion rows retain the complete address.
   * @access protected
   * @since 1.0.0
   * @type {(value: string) => string}
   */
  protected readonly addressLabelOf: (value: string) => string = (value) =>
    this.selectedAddress()?.displayName === value
      ? (this.selectedAddress()?.street ?? value)
      : value;

  /**
   * Method addressSearchQuery
   * @method addressSearchQuery
   * @description Combines the street and structured locality fields for an unambiguous provider lookup.
   * @access protected
   * @since 1.0.0
   * @returns {string} Complete current query.
   */
  protected addressSearchQuery(): string {
    const draft: OnboardingFacilityDraft = this.model();
    return [this.addressQuery(), draft.city, draft.country, draft.postalCode]
      .map((part) => part.trim())
      .filter(Boolean)
      .join(', ');
  }

  /**
   * Method addressPartChanged
   * @method addressPartChanged
   * @description Invalidates the geocoded selection after a locality edit and searches the updated address.
   * @access protected
   * @since 1.0.0
   * @param {'city' | 'country' | 'postalCode'} field - Edited address component.
   * @param {Event} event - Native input event.
   * @returns {void}
   */
  protected addressPartChanged(field: 'city' | 'country' | 'postalCode', event: Event): void {
    const target: EventTarget | null = event.target;
    if (!(target instanceof HTMLInputElement) || this.pending()) return;
    if (target.value === this.selectedAddress()?.[field]) return;
    this.selectedAddress.set(null);
    this.model.update((draft) => ({ ...draft, [field]: target.value, address: '' }));
    this.addressSearched.emit(this.addressSearchQuery());
  }

  //#region Inputs
  /**
   * Property pending
   * @readonly
   * @description Whether the batch is being created, which locks the controls.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property skippable
   * @readonly
   * @description Whether the backend currently lets this step be skipped. The backend never does for facilities, but every step form shares the footer contract.
   * @access public
   * @since 1.1.0
   * @type {InputSignal<boolean>}
   */
  public readonly skippable: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Outputs
  /**
   * Property submitted
   * @readonly
   * @description Emits the staged batch — never empty — once the operator continues.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<readonly SetupCreateFacilityInput[]>}
   */
  public readonly submitted: OutputEmitterRef<readonly SetupCreateFacilityInput[]> =
    output<readonly SetupCreateFacilityInput[]>();

  /**
   * Property skipped
   * @readonly
   * @description Relays the footer's skip request to the page.
   * @access public
   * @since 1.1.0
   * @type {OutputEmitterRef<void>}
   */
  public readonly skipped: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Properties
  /** The currently-edited row. */
  protected readonly model: WritableSignal<OnboardingFacilityDraft> =
    signal<OnboardingFacilityDraft>(EMPTY_VALUES);

  /** Rows already staged for submission. */
  protected readonly staged: WritableSignal<readonly SetupCreateFacilityInput[]> = linkedSignal(
    () => this.restored(),
  );

  /**
   * Property draftForm
   * @readonly
   * @description The field tree and its rules for the row being drafted.
   * @access protected
   * @since 1.0.0
   * @type {FieldTree<OnboardingFacilityDraft>}
   */
  protected readonly draftForm: FieldTree<OnboardingFacilityDraft> = form(this.model, (path) => {
    disabled(path, () => this.pending());
    required(path.address, {
      message: $localize`:@@onboarding.facilitiesForm.addressRequired:Select a suggested address.`,
    });
    validate(path.address, ({ value }) => {
      const selected: SetupFacilityAddressMatch | null = this.selectedAddress();
      return value() &&
        (!selected ||
          selected.displayName !== value() ||
          selected.city !== this.model().city ||
          (selected.country ?? '') !== this.model().country ||
          (selected.postalCode ?? '') !== this.model().postalCode)
        ? {
            kind: 'addressSelection',
            message: $localize`:@@onboarding.facilitiesForm.addressRequired:Select a suggested address.`,
          }
        : null;
    });
    required(path.city, {
      message: $localize`:@@onboarding.facilitiesForm.cityRequired:City is required.`,
    });
    required(path.type, {
      message: $localize`:@@onboarding.facilitiesForm.typeRequired:Facility type is required.`,
    });
    required(path.name, {
      message: $localize`:@@onboarding.facilitiesForm.nameRequired:Name is required.`,
    });
  });

  /** The facility types offered. */
  protected readonly typeOptions: typeof ONBOARDING_FACILITY_TYPE_OPTIONS =
    ONBOARDING_FACILITY_TYPE_OPTIONS;

  /** Whether another row may be staged. */
  protected readonly atCapacity: Signal<boolean> = computed<boolean>(
    () => this.staged().length >= MAX_FACILITIES,
  );

  /** Names a facility type on the closed select trigger. */
  protected readonly typeLabelOf: (value: SetupFacilityType | '') => string = (value) =>
    this.typeOptions.find((option) => option.value === value)?.label ?? '';

  /**
   * Property selectedTypeIcon
   * @readonly
   * @description Type glyph shared by the selected value and its corresponding option.
   * @access protected
   * @since 1.0.0
   * @type {Signal<string | undefined>}
   */
  protected readonly selectedTypeIcon: Signal<string | undefined> = computed(
    () => this.typeOptions.find((option) => option.value === this.model().type)?.icon,
  );

  /**
   * Property selectedCountryIcon
   * @readonly
   * @description Resolves the confirmed provider country code without inferring it from localized text.
   * @access protected
   * @since 1.0.0
   * @type {Signal<string | undefined>}
   */
  protected readonly selectedCountryIcon: Signal<string | undefined> = computed(() => {
    const code: string = this.selectedAddress()?.countryCode?.toLowerCase() ?? '';
    return /^[a-z]{2}$/.test(code) ? `flag${code[0].toUpperCase()}${code[1]}` : undefined;
  });

  /**
   * Property stagedRows
   * @readonly
   * @description The staged batch with a "type · address" summary line per row.
   * @access protected
   * @since 1.1.0
   * @type {Signal<readonly { name: string; summary: string }[]>}
   */
  protected readonly stagedRows: Signal<
    readonly {
      readonly name: string;
      readonly summary: string;
      readonly completed: boolean;
      readonly failed: boolean;
    }[]
  > = computed(() =>
    this.staged().map((row) => ({
      name: row.name,
      completed: this.isCompleted(row),
      failed: this.failed().includes(row.name),
      summary: [this.typeLabelOf(row.type), row.address].filter(Boolean).join(' · '),
    })),
  );

  /**
   * Property submitLabel
   * @readonly
   * @description Counts what a submit would create — the staged rows plus a valid draft — and pluralizes the verb accordingly.
   * @access protected
   * @since 1.1.0
   * @type {Signal<string>}
   */
  protected readonly submitLabel: Signal<string> = computed<string>(() => {
    const total: number = this.staged().length + (this.draftForm().invalid() ? 0 : 1);

    return total >= 2
      ? $localize`:@@onboarding.facilitiesForm.submitMany:Create facilities`
      : $localize`:@@onboarding.facilitiesForm.submitOne:Create facility`;
  });

  /** The footer's label while the batch is being created. */
  protected readonly pendingLabel: string = $localize`:@@onboarding.facilitiesForm.submitting:Saving…`;
  //#endregion

  //#region Methods
  /**
   * Method addFacility
   * @method addFacility
   *
   * @description
   * Stages the current row and resets both the draft and its interaction
   * state, so the next empty facility does not inherit validation errors.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected addFacility(): void {
    if (this.pending() || this.draftForm().invalid() || this.atCapacity()) return;

    const draft: OnboardingFacilityDraft = this.model();
    if (draft.type === '') return;

    const type: SetupFacilityType = draft.type;
    const name: string = draft.name.trim();
    const match: SetupFacilityAddressMatch | null = this.selectedAddress();
    if (!match || match.displayName !== draft.address) return;
    this.stagedAddresses.set(match.displayName, match);
    this.staged.update((rows) => [
      ...rows,
      {
        type,
        name,
        address: match.displayName,
        latitude: match.latitude,
        longitude: match.longitude,
      },
    ]);
    this.model.set(EMPTY_VALUES);
    this.selectedAddress.set(null);
    this.addressQuery.set('');
    this.addressSearched.emit('');
    this.draftForm().reset();
  }

  /**
   * Method removeFacilityLabel
   * @method removeFacilityLabel
   *
   * @description Names one staged row's remove button after the row itself,
   * so several "Remove" buttons stay distinguishable to assistive technology.
   *
   * @access protected
   * @since 1.0.0
   * @param {string} name - The staged row's name.
   * @returns {string} The localized accessible name.
   */
  protected removeFacilityLabel(name: string): string {
    return $localize`:@@onboarding.facilitiesForm.removeNamed:Remove ${name}:name:`;
  }

  /**
   * Method removeFacility
   * @method removeFacility
   *
   * @description
   * Drops a staged row before submission.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {number} index - Position of the row to remove.
   *
   * @returns {void}
   */
  protected removeFacility(index: number): void {
    if (this.pending() || this.isCompleted(this.staged()[index])) return;
    this.staged.update((rows) => rows.filter((_, i) => i !== index));
  }

  /**
   * Method submit
   * @method submit
   *
   * @description
   * Stages the current row first when it is valid, then emits the batch. An
   * empty batch is never emitted — the backend rejects the step without a
   * facility — so with nothing staged the draft is marked touched and its
   * required-field errors name what is missing.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {Event} event - The submit event.
   *
   * @returns {void}
   */
  protected submit(event: Event): void {
    event.preventDefault();

    if (this.pending()) return;

    if (!this.draftForm().invalid()) {
      this.addFacility();
    } else if (
      this.staged().length === 0 ||
      this.model().type !== '' ||
      this.model().name.trim() !== '' ||
      this.addressQuery().trim() !== '' ||
      this.model().city.trim() !== '' ||
      this.model().country.trim() !== '' ||
      this.model().postalCode.trim() !== ''
    ) {
      this.draftForm().markAsTouched();
      return;
    }

    this.submitted.emit(this.staged());
  }
  /**
   * Method editFacility
   * @method editFacility
   * @description Restores an unsaved row and its selected address while preserving any valid current draft.
   * @access protected
   * @since 1.0.0
   * @param {number} index - Prepared row to edit.
   * @returns {void}
   */
  protected editFacility(index: number): void {
    const row: SetupCreateFacilityInput | undefined = this.staged()[index];
    if (!row || this.pending() || this.isCompleted(row)) return;
    if (
      this.model().name.trim() !== '' ||
      this.model().type !== '' ||
      this.addressQuery().trim() !== '' ||
      this.model().city.trim() !== '' ||
      this.model().country.trim() !== '' ||
      this.model().postalCode.trim() !== ''
    ) {
      if (this.draftForm().invalid()) {
        this.draftForm().markAsTouched();
        this.focusDraft();
        return;
      }
      this.addFacility();
    }
    this.removeFacility(index);
    const match: SetupFacilityAddressMatch | null =
      this.stagedAddresses.get(row.address ?? '') ?? null;
    this.selectedAddress.set(match);
    this.model.set({
      type: row.type,
      name: row.name,
      address: row.address ?? '',
      city: match?.city ?? '',
      country: match?.country ?? '',
      postalCode: match?.postalCode ?? '',
    });
    this.addressQuery.set(match?.street ?? row.address ?? '');
    this.addressSearched.emit('');
    this.focusDraft();
  }

  //#endregion
}
