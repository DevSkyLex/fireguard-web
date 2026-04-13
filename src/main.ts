import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app.component';
import { appConfig } from './app/app.config';

bootstrapApplication(App, appConfig).catch((error: unknown) => {
  queueMicrotask(() => {
    throw error instanceof Error ? error : new Error(String(error));
  });
});
