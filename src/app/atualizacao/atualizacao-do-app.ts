import { DOCUMENT, Service, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { SwUpdate } from '@angular/service-worker';
import { filter } from 'rxjs';
import { RECARGA_DA_PAGINA } from './recarga-da-pagina';

/**
 * Mantém o PWA na versão publicada (recomendação do guia do service worker do Angular):
 *
 * - versão nova baixada (VERSION_READY): troca na próxima mudança de página, um momento seguro —
 *   a navegação já passou pelo guard de alterações pendentes, então nenhum formulário é perdido;
 * - cache inconsistente (UNRECOVERABLE_STATE): a versão aberta não consegue mais carregar seus
 *   arquivos; recarrega na hora;
 * - app voltando para a tela (PWA aberto no celular por dias): procura versão nova.
 */
@Service()
export class AtualizacaoDoApp {
  private swUpdate = inject(SwUpdate);
  private router = inject(Router);
  private documento = inject(DOCUMENT);
  private recarga = inject(RECARGA_DA_PAGINA);
  private versaoNovaPronta = false;

  iniciar() {
    if (!this.swUpdate.isEnabled) return; // em desenvolvimento o service worker fica desligado

    this.swUpdate.versionUpdates
      .pipe(filter((evento) => evento.type === 'VERSION_READY'))
      .subscribe(() => (this.versaoNovaPronta = true));

    this.swUpdate.unrecoverable.subscribe(() => this.recarga.recarregar());

    this.router.events
      .pipe(filter((evento) => evento instanceof NavigationEnd))
      .subscribe(() => {
        if (this.versaoNovaPronta) this.recarga.recarregar();
      });

    this.documento.addEventListener('visibilitychange', () => {
      if (this.documento.visibilityState === 'visible') {
        this.swUpdate.checkForUpdate().catch(() => {}); // offline: tenta na próxima vez
      }
    });
  }
}
