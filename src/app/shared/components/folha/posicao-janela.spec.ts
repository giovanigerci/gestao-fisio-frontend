import { posicionarJanela } from './posicao-janela';

const tela = { largura: 1280, altura: 800 };
const janela = { largura: 400, altura: 500 };

describe('posição da janela do dia', () => {
  it('abre à direita do dia quando cabe', () => {
    expect(posicionarJanela({ top: 200, left: 300, right: 420 }, janela, tela)).toEqual({ top: 200, left: 428 });
  });

  it('abre à esquerda quando o dia está perto da borda direita', () => {
    expect(posicionarJanela({ top: 200, left: 1000, right: 1120 }, janela, tela)).toEqual({ top: 200, left: 592 });
  });

  it('sobe para não passar da parte de baixo da tela', () => {
    expect(posicionarJanela({ top: 600, left: 300, right: 420 }, janela, tela).top).toBe(284);
  });

  it('nunca sai pela esquerda nem pelo topo', () => {
    expect(posicionarJanela({ top: -50, left: 0, right: 900 }, janela, { largura: 1000, altura: 800 })).toEqual({
      top: 16,
      left: 16,
    });
  });
});
