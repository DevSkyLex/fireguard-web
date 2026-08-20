import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  PLATFORM_ID,
  signal,
  untracked,
  type EffectRef,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideDownload, lucidePrinter } from '@ng-icons/lucide';
import type { BrnDialogState } from '@spartan-ng/brain/dialog';
import type { FacilityOutput } from '@features/organization/features/facilities/models';
import { HlmButton } from '@shared/ui/button';
import { HlmDialogImports } from '@shared/ui/dialog';

/**
 * Constant QR_PIXEL_SIZE
 *
 * @description
 * Rendered QR edge in pixels. Large enough to stay scannable once printed on
 * a door sticker, which is the smallest surface this image is meant for.
 *
 * @since 1.0.0
 */
const QR_PIXEL_SIZE: number = 320;

/**
 * The one `qrcode` entry point this dialog needs.
 *
 * @since 1.0.0
 */
type QrCodeToDataUrl = typeof import('qrcode').toDataURL;

/**
 * The shape a dynamic `import('qrcode')` can take. The package is CommonJS,
 * so depending on the interop the bundler applies, `toDataURL` sits either on
 * the namespace or under `default`.
 *
 * @since 1.0.0
 */
interface QrCodeModule {
  readonly toDataURL?: QrCodeToDataUrl;
  readonly default?: { readonly toDataURL?: QrCodeToDataUrl };
}

/**
 * Component FacilityQrDialog
 * @class FacilityQrDialog
 *
 * @description
 * A read-level dialog rendering a scannable QR code for one facility's
 * absolute record URL, so a field technician can print it as a door sticker
 * and land back on this record from a phone camera. The QR is generated in
 * the browser from a dynamically imported `qrcode` (mirrors
 * {@link AccountMfaPanel}'s pattern — browser-only, never in the server
 * bundle for a dialog that is behind a click) and is offered both as a
 * printed page (`window.print()`, scoped by the app-wide print stylesheet in
 * `src/styles.css` to the open overlay only) and as a downloadable PNG.
 *
 * Purely presentational (`ARCHITECTURE.md` §10.5): it owns no store and
 * takes the facility record as an input.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-facility-qr-dialog
 *   [visible]="qrDialogVisible()"
 *   [organizationId]="organizationId()"
 *   [facility]="activeFacilityStore.selectedFacility()"
 *   (dismissed)="onQrDialogDismissed()"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-facility-qr-dialog',
  imports: [NgIcon, HlmButton, ...HlmDialogImports],
  providers: [provideIcons({ lucideDownload, lucidePrinter })],
  templateUrl: './facility-qr-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacilityQrDialog {
  //#region Inputs
  /**
   * Property visible
   * @readonly
   * @description Whether the dialog is open.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly visible: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property organizationId
   * @readonly
   * @description The workspace owning the facility, used to build the record URL.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string>}
   */
  public readonly organizationId: InputSignal<string> = input.required<string>();

  /**
   * Property facility
   * @readonly
   * @description The facility the QR points to, or `null` before it has loaded.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<FacilityOutput | null>}
   */
  public readonly facility: InputSignal<FacilityOutput | null> = input<FacilityOutput | null>(null);
  //#endregion

  //#region Outputs
  /**
   * Property dismissed
   * @readonly
   * @description The dialog was closed — Escape, the backdrop, or the close button.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<void>}
   */
  public readonly dismissed: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Properties
  /** Guards the browser-only work: building the URL, generating the QR, printing and downloading. */
  private readonly platformId: object = inject<object>(PLATFORM_ID);

  /** Used to create the download anchor without touching `document` directly. */
  private readonly document: Document = inject<Document>(DOCUMENT);

  /**
   * Property facilityUrl
   * @readonly
   * @description The facility's absolute record URL, empty until a facility and the browser origin are both available.
   * @access protected
   * @since 1.0.0
   * @type {Signal<string>}
   */
  protected readonly facilityUrl: Signal<string> = computed((): string => {
    const facility: FacilityOutput | null = this.facility();
    if (!facility || !isPlatformBrowser(this.platformId)) return '';

    return `${globalThis.location.origin}/organizations/${this.organizationId()}/facilities/${facility.id}`;
  });

  /**
   * Property qrDataUrl
   * @readonly
   * @description The rendered QR as a data URL, or `null` when there is nothing to render or the render failed.
   * @access protected
   * @since 1.0.0
   * @type {WritableSignal<string | null>}
   */
  protected readonly qrDataUrl: WritableSignal<string | null> = signal<string | null>(null);

  /**
   * Property altText
   * @readonly
   * @description The QR image's accessible alt text, naming the facility it links to.
   * @access protected
   * @since 1.0.0
   * @type {Signal<string>}
   */
  protected readonly altText: Signal<string> = computed((): string => {
    const facility: FacilityOutput | null = this.facility();
    if (!facility) return '';

    return $localize`:@@facility.qr.alt:QR code linking to ${facility.name}:facilityName:`;
  });
  //#endregion

  //#region Lifecycle
  /**
   * Property renderQr
   *
   * @description
   * Renders the facility URL whenever the dialog opens on a resolved
   * facility. Browser-only and dynamically imported, so the QR library never
   * enters the server bundle.
   *
   * @access private
   * @since 1.0.0
   */
  private readonly renderQr: EffectRef = effect((): void => {
    const visible: boolean = this.visible();
    const url: string = this.facilityUrl();

    if (!visible || !url) {
      untracked((): void => this.qrDataUrl.set(null));
      return;
    }

    untracked((): void => {
      void this.generateQr(url);
    });
  });
  //#endregion

  //#region Methods
  /**
   * Method onDialogStateChanged
   * @description Relays a dismissal — Escape, the backdrop, or the close button — as {@link dismissed}.
   * @access protected
   * @since 1.0.0
   * @param {BrnDialogState} state - The dialog's new state.
   * @returns {void}
   */
  protected onDialogStateChanged(state: BrnDialogState): void {
    if (state === 'open') return;

    this.dismissed.emit();
  }

  /**
   * Method print
   * @description Opens the browser print dialog. The app-wide print stylesheet keeps only this open overlay on the page.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected print(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    globalThis.print();
  }

  /**
   * Method download
   * @description Saves the rendered QR as a PNG through a programmatic anchor click. A no-op until the QR has rendered.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected download(): void {
    const dataUrl: string | null = this.qrDataUrl();
    const facility: FacilityOutput | null = this.facility();
    if (!dataUrl || !facility || !isPlatformBrowser(this.platformId)) return;

    const anchor: HTMLAnchorElement = this.document.createElement('a');
    anchor.href = dataUrl;
    anchor.download = `${this.slugify(facility.code ?? facility.name)}-qr.png`;
    anchor.click();
  }

  /**
   * Method generateQr
   * @description Draws the facility URL. A failure is swallowed on purpose: the record stays reachable by other means, so a missing QR costs convenience, not access.
   * @access private
   * @since 1.0.0
   * @param {string} url - The facility's absolute record URL.
   * @returns {Promise<void>}
   */
  private async generateQr(url: string): Promise<void> {
    try {
      // `qrcode` ships CommonJS. Whether the interop surfaces `toDataURL` as a
      // named export or only under `default` depends on how the bundler wrapped
      // it, and the two forms are NOT interchangeable: destructuring the named
      // one threw `toDataURL is not a function` under a cold Vite dep-optimize,
      // which the catch below then swallowed into a permanent "Generating…".
      const module: QrCodeModule = await import('qrcode');
      const toDataURL: QrCodeToDataUrl | undefined = module.toDataURL ?? module.default?.toDataURL;

      if (!toDataURL) {
        this.qrDataUrl.set(null);

        return;
      }

      this.qrDataUrl.set(
        await toDataURL(url, { errorCorrectionLevel: 'M', margin: 1, width: QR_PIXEL_SIZE }),
      );
    } catch {
      this.qrDataUrl.set(null);
    }
  }

  /**
   * Method slugify
   * @description Turns a facility's code or name into a filesystem-safe download filename stem.
   * @access private
   * @since 1.0.0
   * @param {string} value - The source text.
   * @returns {string} The lowercased, hyphen-separated slug.
   */
  private slugify(value: string): string {
    return (
      value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') || 'facility'
    );
  }
  //#endregion
}
