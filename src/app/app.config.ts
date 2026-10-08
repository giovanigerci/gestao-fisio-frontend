import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners, isDevMode } from '@angular/core';
import { provideRouter, withRouterConfig } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideServiceWorker } from '@angular/service-worker';

import { routes } from './app.routes';
import { authInterceptor } from './interceptors/auth-interceptor';
import { AtualizacaoDoApp } from './atualizacao/atualizacao-do-app';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      // 'computed': se um guard cancelar a navegação do botão voltar (ex: modal com alterações),
      // o histórico volta ao ponto certo em vez de ficar com uma entrada a menos
      withRouterConfig({ canceledNavigationResolution: 'computed' }),
    ),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
    provideAppInitializer(() => inject(AtualizacaoDoApp).iniciar()),
  ]
};
