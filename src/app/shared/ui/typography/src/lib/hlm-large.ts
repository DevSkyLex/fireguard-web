import { Directive } from '@angular/core';
import { classes } from '@shared/ui/utils';

export const hlmLarge = 'text-lg font-semibold';

@Directive({
  selector: '[hlmLarge]',
})
export class HlmLarge {
  constructor() {
    classes(() => hlmLarge);
  }
}
