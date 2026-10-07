/**
 * Interface InterventionClosureSnapshotOutput
 * @interface InterventionClosureSnapshotOutput
 *
 * @description
 * Immutable publication dossier captured by the server. Historical publications may omit it.
 */
export interface InterventionClosureSnapshotOutput {
  /**
   * Property version
   * @readonly
   *
   * @description
   * Schema version of the immutable closure dossier.
   *
   * @access public
   *
   * @type {1 | 2}
   */
  readonly version: 1 | 2;

  /**
   * Property capturedAt
   * @readonly
   *
   * @description
   * Server instant at which the publication dossier was frozen.
   *
   * @access public
   *
   * @type {string}
   */
  readonly capturedAt: string;

  /**
   * Property interventionId
   * @readonly
   *
   * @description
   * Intervention identifier represented by the frozen dossier.
   *
   * @access public
   *
   * @type {string}
   */
  readonly interventionId: string;

  /**
   * Property revision
   * @readonly
   *
   * @description
   * Captured intervention revision, independent of later operational edits.
   *
   * @access public
   *
   * @type {number}
   */
  readonly revision: number;

  /**
   * Property site
   * @readonly
   *
   * @description
   * Site identity at publication, when the intervention has a site.
   *
   * @access public
   *
   * @type {{ readonly id: string; readonly name: string } | null}
   */
  readonly site: { readonly id: string; readonly name: string } | null;

  /**
   * Property customer
   * @readonly
   *
   * @description
   * Customer identity at publication, without private contact data.
   *
   * @access public
   *
   * @type {{
   *   readonly id: string;
   *   readonly name: string;
   * } | null}
   */
  readonly customer: {
    readonly id: string;
    readonly name: string;
  } | null;

  /**
   * Property memberNames
   * @readonly
   *
   * @description
   * Recorded member names used by the frozen report.
   *
   * @access public
   *
   * @type {Readonly<Record<string, string>>}
   */
  readonly memberNames: Readonly<Record<string, string>>;

  /**
   * Property workItems
   * @readonly
   *
   * @description
   * Raw work-item facts at closure, without live capabilities or resolved target summaries.
   *
   * @access public
   *
   * @type {readonly Readonly<Record<string, unknown>>[]}
   */
  readonly workItems: readonly Readonly<Record<string, unknown>>[];

  /**
   * Property attachments
   * @readonly
   *
   * @description
   * Evidence metadata captured with the publication dossier.
   *
   * @access public
   *
   * @type {readonly {
   *   readonly id: string;
   *   readonly fileName: string;
   *   readonly kind: string;
   *   readonly mimeType: string;
   *   readonly size: number;
   *   readonly label: string | null;
   *   readonly workItemId: string | null;
   *   readonly revision: number;
   *   readonly uploadedAt: string;
   * }[]}
   */
  readonly attachments: readonly {
    readonly id: string;
    readonly fileName: string;
    readonly kind: string;
    readonly mimeType: string;
    readonly size: number;
    readonly label: string | null;
    readonly workItemId: string | null;
    readonly revision: number;
    readonly uploadedAt: string;
  }[];

  /**
   * Property timeEntries
   * @readonly
   *
   * @description
   * Time journal facts captured at publication, including recorded cancellations.
   *
   * @access public
   *
   * @type {readonly {
   *   readonly id: string;
   *   readonly workItemId: string | null;
   *   readonly memberId: string;
   *   readonly workedOn: string;
   *   readonly minutes: number;
   *   readonly note: string | null;
   *   readonly cancelled: boolean;
   *   readonly revision: number;
   * }[]}
   */
  readonly timeEntries: readonly {
    readonly id: string;
    readonly workItemId: string | null;
    readonly memberId: string;
    readonly workedOn: string;
    readonly minutes: number;
    readonly note: string | null;
    readonly cancelled: boolean;
    readonly revision: number;
  }[];

  /**
   * Property report
   * @readonly
   *
   * @description
   * Frozen report context used by the server to reproduce the publication document.
   *
   * @access public
   *
   * @type {Readonly<Record<string, unknown>>}
   */
  readonly report: Readonly<Record<string, unknown>>;
}
