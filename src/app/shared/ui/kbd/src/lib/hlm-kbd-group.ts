import { Directive } from '@angular/core';
import { classes } from '@shared/ui/utils';

@Directive({
  selector: 'kbd[hlmKbdGroup]',
  host: {
    'data-slot': 'kbd-group',
  },
})
export class HlmKbdGroup {
  constructor() {
    classes(() => 'gap-1 inline-flex items-center');
  }
}
