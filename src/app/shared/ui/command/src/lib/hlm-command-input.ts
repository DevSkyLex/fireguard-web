import {
  ChangeDetectionStrategy,
  Component,
  input,
  type InputSignal,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideSearch } from '@ng-icons/lucide';
import { BrnCommandInput } from '@spartan-ng/brain/command';
import { HlmInputGroupImports } from '@shared/ui/input-group';
import { classes } from '@shared/ui/utils';

/**
 * Component HlmCommandInput
 * @class HlmCommandInput
 *
 * @description
 * Spartan Nova command query field composed from the Brain command input and
 * the shared input-group surface. Consumers may override host layout spacing.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'hlm-command-input',
  imports: [HlmInputGroupImports, NgIcon, BrnCommandInput],
  providers: [provideIcons({ lucideSearch })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'data-slot': 'command-input-wrapper',
  },
  template: `
    <hlm-input-group
      class="h-8! rounded-lg! border-input/30 bg-input/30 shadow-none! *:data-[slot=input-group-addon]:ps-2!"
    >
      <input
        brnCommandInput
        data-slot="command-input"
        class="w-full text-sm outline-hidden disabled:cursor-not-allowed disabled:opacity-50"
        [id]="inputId()"
        [placeholder]="placeholder()"
      />

      <hlm-input-group-addon>
        <ng-icon name="lucideSearch" class="shrink-0 text-[length:--spacing(4)] opacity-50" />
      </hlm-input-group-addon>
    </hlm-input-group>
  `,
})
export class HlmCommandInput {
  /**
   * Property inputId
   * @readonly
   *
   * @description Optional native identifier for the command search input.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string | undefined>}
   */
  public readonly inputId: InputSignal<string | undefined> = input<string | undefined>();

  /**
   * Property placeholder
   * @readonly
   *
   * @description Hint displayed while the command query is empty.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string>}
   */
  public readonly placeholder: InputSignal<string> = input<string>('');

  /**
   * Constructor
   * @constructor
   *
   * @description Applies the native Spartan Nova spacing to the command input wrapper.
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    classes(() => 'p-1 pb-0');
  }
}
