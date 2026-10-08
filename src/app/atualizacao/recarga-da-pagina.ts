import { InjectionToken } from '@angular/core';

/** Recargas completas da página, isoladas num token para os testes poderem substituí-las. */
export interface RecargaDaPagina {
  /** Recarrega a página atual. */
  recarregar(): void;
  /** Carrega a URL do zero (ex: a página que falhou ao abrir). */
  abrir(url: string): void;
}

export const RECARGA_DA_PAGINA = new InjectionToken<RecargaDaPagina>('RECARGA_DA_PAGINA', {
  providedIn: 'root',
  factory: () => ({
    recarregar: () => window.location.reload(),
    abrir: (url) => window.location.assign(url),
  }),
});
