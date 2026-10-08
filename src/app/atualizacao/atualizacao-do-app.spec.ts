import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { SwUpdate, VersionEvent } from '@angular/service-worker';
import { Subject } from 'rxjs';
import { AtualizacaoDoApp } from './atualizacao-do-app';
import { RECARGA_DA_PAGINA } from './recarga-da-pagina';

@Component({ template: '' })
class Pagina {}

describe('AtualizacaoDoApp', () => {
  let versoes: Subject<VersionEvent>;
  let irrecuperavel: Subject<unknown>;
  let checkForUpdate: ReturnType<typeof vi.fn>;
  let recarregar: ReturnType<typeof vi.fn>;
  let router: Router;

  function iniciar(isEnabled = true) {
    versoes = new Subject();
    irrecuperavel = new Subject();
    checkForUpdate = vi.fn().mockResolvedValue(false);
    recarregar = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'agenda', component: Pagina }, { path: 'pacientes', component: Pagina }]),
        { provide: SwUpdate, useValue: { isEnabled, versionUpdates: versoes, unrecoverable: irrecuperavel, checkForUpdate } },
        { provide: RECARGA_DA_PAGINA, useValue: { recarregar, abrir: vi.fn() } },
      ],
    });
    router = TestBed.inject(Router);
    TestBed.inject(AtualizacaoDoApp).iniciar();
  }

  const versaoPronta = () =>
    versoes.next({ type: 'VERSION_READY', currentVersion: { hash: 'a' }, latestVersion: { hash: 'b' } } as VersionEvent);

  it('versão nova pronta: não recarrega no meio do uso, só na próxima mudança de página', async () => {
    iniciar();
    await router.navigateByUrl('/agenda');

    versaoPronta();
    expect(recarregar).not.toHaveBeenCalled();

    await router.navigateByUrl('/pacientes');
    expect(recarregar).toHaveBeenCalledTimes(1);
  });

  it('sem versão nova, navegar não recarrega', async () => {
    iniciar();
    await router.navigateByUrl('/agenda');
    await router.navigateByUrl('/pacientes');

    expect(recarregar).not.toHaveBeenCalled();
  });

  it('cache inconsistente: recarrega na hora', () => {
    iniciar();

    irrecuperavel.next({ type: 'UNRECOVERABLE_STATE', reason: 'hash mismatch' });

    expect(recarregar).toHaveBeenCalledTimes(1);
  });

  it('app voltando para a tela procura versão nova', () => {
    iniciar();

    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    document.dispatchEvent(new Event('visibilitychange'));

    expect(checkForUpdate).toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it('service worker desligado (desenvolvimento): não faz nada', async () => {
    iniciar(false);

    versaoPronta();
    irrecuperavel.next({});
    await router.navigateByUrl('/agenda');

    expect(recarregar).not.toHaveBeenCalled();
  });
});
