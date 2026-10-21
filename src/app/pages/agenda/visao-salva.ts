export type Visao = 'semana' | 'mes';

const CHAVE = 'gf:agenda-visao';

/** Visão escolhida no seletor, guardada no aparelho: no celular e no computador cada uma pode ser diferente. */
export function lerVisaoSalva(): Visao {
  try {
    return localStorage.getItem(CHAVE) === 'mes' ? 'mes' : 'semana';
  } catch {
    return 'semana';
  }
}

export function salvarVisao(visao: Visao): void {
  try {
    localStorage.setItem(CHAVE, visao);
  } catch {
    // armazenamento indisponível (ex: modo privado restrito): só não lembra a escolha
  }
}
