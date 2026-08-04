import { DatePipe, TitleCasePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import {
  resolveFacilityTag,
  type FacilityOutput,
  type UpdateFacilityInput,
} from '@features/organization/features/facilities/models';
import { InplaceField } from '@shared/inplace-field';
import { type TagDescriptor } from '@shared/tag';

/**
 * The properties this panel can write. `type` and the parent are absent because
 * the update endpoint accepts neither — the parent moves through its own
 * action, and the type is fixed at creation.
 */
type EditableField = 'name' | 'code' | 'address' | 'coordinates';

/**
 * Component FacilityInformationPanel
 * @class FacilityInformationPanel
 *
 * @description
 * The site's descriptive properties, read and written in the same place.
 *
 * A record no longer needs a page to read it and another to write it
 * (ARCHITECTURE.md §10.5): each property opens where it sits, keeps its draft
 * here, and emits a patch for the page to persist. The panel injects no store —
 * it holds the drafts, the page owns the call.
 *
 * @version 2.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-facility-information-panel',
  imports: [
    DatePipe,
    TitleCasePipe,
    ReactiveFormsModule,
    InputTextModule,
    TagModule,
    TextareaModule,
    InplaceField,
  ],
  templateUrl: './facility-information-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacilityInformationPanel {
  //#region Inputs
  /**
   * Property facility
   * @readonly
   *
   * @description
   * The facility whose information is displayed.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<FacilityOutput>}
   */
  public readonly facility: InputSignal<FacilityOutput> = input.required<FacilityOutput>();

  /**
   * Property editable
   * @readonly
   *
   * @description
   * Whether the operator may change these properties. Read-only renders plain
   * values with no affordance, rather than controls that refuse.
   *
   * @access public
   * @since 2.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly editable: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property saving
   * @readonly
   *
   * @description
   * Whether a save is in flight.
   *
   * @access public
   * @since 2.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly saving: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property saveError
   * @readonly
   *
   * @description
   * Message from the last failed save, shown under the field that produced it.
   *
   * @access public
   * @since 2.0.0
   *
   * @type {InputSignal<string | null>}
   */
  public readonly saveError: InputSignal<string | null> = input<string | null>(null);
  //#endregion

  //#region Outputs
  /**
   * Property changed
   * @readonly
   *
   * @description
   * A property was confirmed; carries the patch to persist.
   *
   * @access public
   * @since 2.0.0
   *
   * @type {OutputEmitterRef<UpdateFacilityInput>}
   */
  public readonly changed: OutputEmitterRef<UpdateFacilityInput> = output<UpdateFacilityInput>();
  //#endregion

  //#region Properties
  /** Draft name. */
  protected readonly nameControl: FormControl<string> = new FormControl<string>('', {
    nonNullable: true,
  });

  /** Draft code. */
  protected readonly codeControl: FormControl<string> = new FormControl<string>('', {
    nonNullable: true,
  });

  /** Draft address. */
  protected readonly addressControl: FormControl<string> = new FormControl<string>('', {
    nonNullable: true,
  });

  /** Draft latitude. */
  protected readonly latitudeControl: FormControl<string> = new FormControl<string>('', {
    nonNullable: true,
  });

  /** Draft longitude. */
  protected readonly longitudeControl: FormControl<string> = new FormControl<string>('', {
    nonNullable: true,
  });

  /**
   * Property openField
   *
   * @description
   * Which property is currently being edited, so a failed save shows its
   * message under the field that produced it rather than under all of them.
   *
   * @access private
   * @since 2.0.0
   *
   * @type {WritableSignal<EditableField | null>}
   */
  private readonly openField: WritableSignal<EditableField | null> = signal<EditableField | null>(
    null,
  );

  /**
   * Property coordinatesDisplay
   * @readonly
   *
   * @description
   * The pair as one line, or nothing when neither is set.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<string | null>}
   */
  protected readonly coordinatesDisplay: Signal<string | null> = computed<string | null>(() => {
    const facility: FacilityOutput = this.facility();

    // API Platform omits null fields, so an unset coordinate arrives as
    // `undefined` rather than `null` — a `=== null` guard would let it through.
    if (facility.latitude == null || facility.longitude == null) return null;

    return `${facility.latitude}, ${facility.longitude}`;
  });
  //#endregion

  //#region Methods
  /**
   * Method statusDescriptor
   *
   * @description
   * Resolves the facility status badge descriptor from the facility tag
   * registry so status carries a label and icon, never colour alone.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {FacilityOutput['status']} status - Facility lifecycle status.
   * @returns {TagDescriptor} Matching status descriptor.
   */
  protected statusDescriptor(status: FacilityOutput['status']): TagDescriptor {
    return resolveFacilityTag('status', status);
  }

  /**
   * Method fieldError
   *
   * @description
   * The save message, but only under the field that is open.
   *
   * @access protected
   * @since 2.0.0
   *
   * @param {EditableField} field - Field asking.
   * @returns {string | null} The message, or null.
   */
  protected fieldError(field: EditableField): string | null {
    return this.openField() === field ? this.saveError() : null;
  }

  /**
   * Method seed
   *
   * @description
   * Fills a text draft from the stored value as its field opens.
   *
   * @access protected
   * @since 2.0.0
   *
   * @param {EditableField} field - Field being opened.
   * @param {string | null} value - Current stored value.
   * @returns {void}
   */
  protected seed(field: EditableField, value: string | null): void {
    this.openField.set(field);
    this.controlFor(field).setValue(value ?? '');
  }

  /**
   * Method seedCoordinates
   *
   * @description
   * Fills both coordinate drafts as the pair opens.
   *
   * @access protected
   * @since 2.0.0
   *
   * @returns {void}
   */
  protected seedCoordinates(): void {
    const facility: FacilityOutput = this.facility();

    this.openField.set('coordinates');
    this.latitudeControl.setValue(facility.latitude == null ? '' : String(facility.latitude));
    this.longitudeControl.setValue(facility.longitude == null ? '' : String(facility.longitude));
  }

  /**
   * Method save
   *
   * @description
   * Emits the patch for one property. A trimmed empty text clears the property
   * rather than saving a blank string.
   *
   * @access protected
   * @since 2.0.0
   *
   * @param {EditableField} field - Field being confirmed.
   * @returns {void}
   */
  protected save(field: EditableField): void {
    if (field === 'coordinates') {
      this.changed.emit({
        latitude: this.toCoordinate(this.latitudeControl.value),
        longitude: this.toCoordinate(this.longitudeControl.value),
      });

      return;
    }

    const value: string = this.controlFor(field).value.trim();

    // The name is the record's handle: emptying it would leave a nameless site,
    // so a blank draft is a no-op rather than a clear.
    if (field === 'name' && !value) return;

    this.changed.emit({ [field]: value ? value : null });
  }

  /**
   * Method clearError
   *
   * @description
   * Forgets which field was open, so a stale message does not reappear on the
   * next one.
   *
   * @access protected
   * @since 2.0.0
   *
   * @returns {void}
   */
  protected clearError(): void {
    this.openField.set(null);
  }

  /**
   * Method controlFor
   *
   * @description
   * The draft behind one text property.
   *
   * @access private
   * @since 2.0.0
   *
   * @param {EditableField} field - Field asking.
   * @returns {FormControl<string>} Its draft control.
   */
  private controlFor(field: EditableField): FormControl<string> {
    switch (field) {
      case 'name':
        return this.nameControl;
      case 'code':
        return this.codeControl;
      case 'address':
        return this.addressControl;
      case 'coordinates':
        return this.latitudeControl;
    }
  }

  /**
   * Method toCoordinate
   *
   * @description
   * Reads a coordinate draft, treating an empty or unparseable entry as
   * "not set" rather than as zero — which would place the site off West Africa.
   *
   * @access private
   * @since 2.0.0
   *
   * @param {string} raw - Draft value.
   * @returns {number | null} The coordinate, or null.
   */
  private toCoordinate(raw: string): number | null {
    const trimmed: string = raw.trim();
    if (!trimmed) return null;

    const parsed: number = Number(trimmed);

    return Number.isFinite(parsed) ? parsed : null;
  }
  //#endregion
}
