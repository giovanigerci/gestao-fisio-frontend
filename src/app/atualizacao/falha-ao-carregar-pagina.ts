import { inject } from '@angular/core';
import { NavigationError } from '@angular/router';
import { RECARGA_DA_PAGINA } from './recarga-da-pagina';

/**
 * Mensagens dos navegadores quando o arquivo de código de uma página (lazy loading) não baixa.
 * Acontece depois de um deploy: a versão aberta (ou guardada pelo service worker) pede um
 * `chunk-*.js` que não existe mais no servidor.
 */
const FALHAS_DE_DOWNLOAD = [
  /Failed to fetch dynamically imported module/i, // Chrome, Edge
  /error loading dynamically imported module/i, // Firefox
  /Importing a module script failed/i, // Safari
  /ChunkLoadError|Loading chunk .+ failed/i,
];

const CHAVE = 'gf:recarga-por-falha-de-carregamento';
const JANELA_MS = 10_000;

export function ehFalhaAoBaixarCodigo(erro: unknown): boolean {
  const mensagem = erro instanceof Error ? `${erro.name} ${erro.message}` : String(erro ?? '');
  return FALHAS_DE_DOWNLOAD.some((padrao) => padrao.test(mensagem));
}

/**
 * Recarregar a página corrige (o navegador busca a versão nova), mas só uma vez por URL a cada
 * 10s: se o arquivo continuar faltando, não entra num ciclo infinito de recargas.
 */
export function podeRecarregar(url: string, agora = Date.now()): boolean {
  try {
    const anterior = JSON.parse(sessionStorage.getItem(CHAVE) ?? 'null') as { url: string; em: number } | null;
    if (anterior && anterior.url === url && agora - anterior.em < JANELA_MS) return false;
    sessionStorage.setItem(CHAVE, JSON.stringify({ url, em: agora }));
  } catch {
    // sessionStorage indisponível (ex: modo privado restrito): recarrega mesmo assim
  }
  return true;
}

/**
 * Para `withNavigationErrorHandler`: quando a página não abre porque o código dela não baixou,
 * carrega a URL de destino do zero em vez de deixar a área da página vazia.
 */
export function recarregarSeFalhouAoBaixarCodigo(evento: NavigationError): void {
  if (!ehFalhaAoBaixarCodigo(evento.error) || !podeRecarregar(evento.url)) return;
  inject(RECARGA_DA_PAGINA).abrir(evento.url);
}
