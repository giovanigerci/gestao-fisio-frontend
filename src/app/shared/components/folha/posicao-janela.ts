export interface Retangulo {
  top: number;
  left: number;
  right: number;
}

export interface Tamanho {
  largura: number;
  altura: number;
}

const MARGEM = 16;
const DISTANCIA = 8;

/** Ao lado do dia (à direita se couber, senão à esquerda), sem sair da tela. */
export function posicionarJanela(ancora: Retangulo, janela: Tamanho, tela: Tamanho) {
  let left = ancora.right + DISTANCIA;
  if (left + janela.largura > tela.largura - MARGEM) left = ancora.left - DISTANCIA - janela.largura;
  left = Math.max(MARGEM, Math.min(left, tela.largura - MARGEM - janela.largura));
  const top = Math.max(MARGEM, Math.min(ancora.top, tela.altura - MARGEM - janela.altura));
  return { top, left };
}
