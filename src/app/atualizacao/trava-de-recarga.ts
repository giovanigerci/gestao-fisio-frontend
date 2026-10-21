const CHAVE = 'gf:ultima-recarga-automatica';
const INTERVALO_MS = 60_000;

/**
 * No máximo uma recarga automática por minuto na aba: se a versão nova continuar falhando (ex: service
 * worker antigo preso atrás de um redirecionamento), a página não entra num ciclo de recargas.
 */
export function podeRecarregarAutomaticamente(agora = Date.now()): boolean {
  try {
    const anterior = Number(sessionStorage.getItem(CHAVE));
    if (anterior && agora >= anterior && agora - anterior < INTERVALO_MS) return false;
    sessionStorage.setItem(CHAVE, String(agora));
  } catch {
    // sessionStorage indisponível (ex: modo privado restrito): recarrega mesmo assim
  }
  return true;
}
