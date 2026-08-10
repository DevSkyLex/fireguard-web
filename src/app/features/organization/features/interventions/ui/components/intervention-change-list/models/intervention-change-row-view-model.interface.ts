import type { InterventionChangeOutput } from '@features/organization/features/interventions/models';
import type { InterventionChangePatchLine } from './intervention-change-patch-line.interface';

/**
 * Interface InterventionChangeRowViewModel
 * @interface InterventionChangeRowViewModel
 *
 * @description
 * One proposed change with its per-row derivations resolved once — the
 * resource kind, the formatted patch lines and the row's own pending flag.
 * `formatInterventionChangePatch` allocates a fresh array, so calling it from
 * a template binding rebuilt every line on every change-detection pass.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface InterventionChangeRowViewModel {
  //#region Properties
  /** The underlying proposed change. */
  readonly change: InterventionChangeOutput;

  /** The short, localized kind of resource the change's IRI points at. */
  readonly resourceKind: string;

  /** The change's patch as readable field/value lines. */
  readonly patchLines: readonly InterventionChangePatchLine[];

  /** Whether this row's own rejection is in flight. */
  readonly pending: boolean;
  //#endregion
}
