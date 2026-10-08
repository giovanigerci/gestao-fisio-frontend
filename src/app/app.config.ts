import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners, isDevMode } from '@angular/core';
import { provideRouter, withNavigationErrorHandler, withRouterConfig } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideServiceWorker } from '@angular/service-worker';

import { routes } from './app.routes';
import { authInterceptor } from './interceptors/auth-interceptor';
import { AtualizacaoDoApp } from './atualizacao/atualizacao-do-app';
import { recarregarSeFalhouAoBaixarCodigo } from './atualizacao/falha-ao-carregar-pagina';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      // 'computed': se um guard cancelar a navegação do botão voltar (ex: modal com alterações),
      // o histórico volta ao ponto certo em vez de ficar com uma entrada a menos
      withRouterConfig({ canceledNavigationResolution: 'computed' }),
      // Código da página não baixou (deploy novo): abre a página do zero em vez de deixar a área vazia
      withNavigationErrorHandler(recarregarSeFalhouAoBaixarCodigo),
    ),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
    provideAppInitializer(() => inject(AtualizacaoDoApp).iniciar()),
  ]
};
