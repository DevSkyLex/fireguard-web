import { Directive } from '@angular/core';
import { classes } from '@shared/ui/utils';

@Directive({
  selector: '[hlmCommandEmpty]',
  host: {
    'data-slot': 'command-empty',
  },
})
export class HlmCommandEmpty {
  constructor() {
    classes(() => 'py-6 text-center text-sm');
  }
}
