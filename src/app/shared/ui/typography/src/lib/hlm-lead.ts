import { Directive } from '@angular/core';
import { classes } from '@shared/ui/utils';

export const hlmLead = 'text-xl text-muted-foreground';

@Directive({
  selector: '[hlmLead]',
})
export class HlmLead {
  constructor() {
    classes(() => hlmLead);
  }
}
